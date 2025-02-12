import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import { desc, gte } from 'drizzle-orm';
import { z } from 'zod';

import { env } from '../config/env.js';
import { setupDatabase } from '../db/index.js';
import { articles } from '../db/schema.js';
import { Article, ArticleSchema } from '../types/article.js';

import { fetchRealNews } from './world-news.js';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
const db = setupDatabase();

const GeneratedArticleSchema = z.array(ArticleSchema.omit({ createdAt: true, id: true }));

const formatNewsItem = (index: number, title: string, summary: string | null): string => {
    const baseText = `${index + 1}. "${title}"`;
    return summary ? baseText + ` (Context: ${summary})` : baseText;
};

const formatNewsItems = (items: Array<{ title: string; summary: string | null }>) =>
    items.map((item, i) => formatNewsItem(i, item.title, item.summary)).join('\n');

const formatRecentArticle = (index: number, headline: string, summary: string): string =>
    `${index + 1}. "${headline}" - ${summary}`;

const formatRecentArticles = (items: Array<{ headline: string; summary: string }>) =>
    items.map((item, i) => formatRecentArticle(i, item.headline, item.summary)).join('\n');

const generateMixedNewsPrompt = (
    newsItems: Array<{ title: string; summary: string | null }>,
    recentArticles: Array<{ headline: string; summary: string }>,
) => `You're creating content for an engaging "Spot the Fake News" game where players try to identify which news articles are real and which are fictional. Make it fun and challenging!

For REAL articles:
- Use the exact headlines provided
- Add interesting but factual details that make the story engaging
- Keep the tone light but informative
- Include surprising but true facts when possible

For FICTIONAL articles:
- Create headlines that are clever and intriguing, but not obviously fake
- Mix plausible elements with slightly unusual twists
- Use humor subtly - avoid over-the-top or absurd content
- Make them related to current themes but with unexpected angles
- Create stories that make players think "Wait... could this be real?"

The response MUST BE A VALID JSON and MATCH THIS FORMAT:
[
  {
    "headline": "The headline (exact headline for real news)",
    "article": "An engaging ~70 word article that keeps players guessing",
    "category": "One of: WORLD, POLITICS, BUSINESS, TECHNOLOGY, SCIENCE, HEALTH, SPORTS, ENTERTAINMENT, LIFESTYLE, OTHER",
    "summary": "A catchy 1-2 sentence summary that makes players want to read more",
    "isFake": boolean
  }
]

Real headlines to work with:
${formatNewsItems(newsItems)}

Recently generated articles to avoid duplicating:
${formatRecentArticles(recentArticles)}

Important guidelines:
- Create a balanced mix of real and fictional articles
- Make both real and fake articles equally engaging
- Use a conversational, modern writing style
- Include relevant details that make players think critically
- Avoid obvious tells that give away whether an article is real or fake
- Return only valid JSON`;

type GenerateArticleParams = {
    model: GenerativeModel;
    prompt: string;
    publishDate?: string;
};

const generateArticleFromPrompt = async ({
    model,
    prompt,
    publishDate,
}: GenerateArticleParams): Promise<Article[]> => {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    if (!text) return [];

    const json = text.slice(text.indexOf('['), text.lastIndexOf(']') + 1);
    const articles = GeneratedArticleSchema.parse(JSON.parse(json));

    // Base date from publishDate or current time
    const baseDate = publishDate ? new Date(publishDate) : new Date();

    // Shuffle articles to randomize real/fake order
    const shuffledArticles = [...articles].sort(() => Math.random() - 0.5);

    // Add a small time increment for each article to ensure uniqueness
    return shuffledArticles.map((article, index) => {
        const uniqueDate = new Date(baseDate);
        // Add index * 1 second to ensure unique timestamps
        uniqueDate.setSeconds(uniqueDate.getSeconds() + index);

        return {
            ...article,
            createdAt: uniqueDate,
            id: crypto.randomUUID(),
        };
    });
};

export const generateArticles = async (): Promise<Article[]> => {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
        const realNews = await fetchRealNews();

        // Get articles from the last 2 weeks to avoid duplication
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        const recentArticles = await db
            .select({
                headline: articles.headline,
                summary: articles.summary,
            })
            .from(articles)
            .where(gte(articles.createdAt, twoWeeksAgo))
            .orderBy(desc(articles.createdAt))
            .all();

        // Shuffle and take a random selection of real news
        const newsToProcess = [...realNews].sort(() => Math.random() - 0.5).slice(0, 7);

        const prompt = generateMixedNewsPrompt(
            newsToProcess.map((news) => ({
                summary: news.summary ?? null,
                title: news.title,
            })),
            recentArticles,
        );

        const generatedArticles = await generateArticleFromPrompt({
            model,
            prompt,
            publishDate: newsToProcess[0].publish_date,
        });

        // Log generation stats for monitoring
        const realCount = generatedArticles.filter((a) => !a.isFake).length;
        const fakeCount = generatedArticles.filter((a) => a.isFake).length;
        console.log(
            `Generated ${generatedArticles.length} articles (${realCount} real, ${fakeCount} fake)`,
        );

        return generatedArticles;
    } catch (error) {
        console.error('Failed to generate articles:', error);
        throw error;
    }
};
