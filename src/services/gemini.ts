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
) => `Based on these real news headlines, generate a mix of real and fictional news articles. For real articles, expand on the given headlines. For fictional articles, create plausible stories that could have happened in a parallel universe, related to the themes of the real news. Each article should be approximately 70 words long.

The response MUST BE A VALID JSON and MATCH THIS FORMAT:
[
  {
    "headline": "The headline (use exact headline for real news)",
    "article": "A detailed ~70 word article about the topic",
    "category": "One of: WORLD, POLITICS, BUSINESS, TECHNOLOGY, SCIENCE, HEALTH, SPORTS, ENTERTAINMENT, LIFESTYLE, OTHER",
    "summary": "A concise 1-2 sentence summary of the article",
    "isFake": boolean
  }
]

Here are the real headlines for context:
${formatNewsItems(newsItems)}

Here are recently generated articles to AVOID duplicating (last 2 weeks):
${formatRecentArticles(recentArticles)}

Important:
- Create a natural mix of real and fictional articles
- For real articles, keep the headlines exactly as provided
- For fictional articles, create related but clearly different headlines
- Ensure each article is around 70 words
- DO NOT generate articles similar to the recent ones listed above
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

    console.log(text);

    const articles = GeneratedArticleSchema.parse(JSON.parse(json));
    return articles.map((article) => ({
        ...article,
        createdAt: publishDate ? new Date(publishDate) : new Date(),
        id: crypto.randomUUID(),
    }));
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

        // Shuffle the real news array and take first 7 items
        const newsToProcess = [...realNews].sort(() => Math.random() - 0.5).slice(0, 7);

        // Generate mixed articles in one batch
        const prompt = generateMixedNewsPrompt(
            newsToProcess.map((news) => ({
                summary: news.summary ?? null,
                title: news.title,
            })),
            recentArticles,
        );

        return await generateArticleFromPrompt({
            model,
            prompt,
            publishDate: newsToProcess[0].publish_date,
        });
    } catch (error) {
        console.error('Failed to generate articles:', error);
        throw error;
    }
};
