import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

import { env } from '../config/env.js';
import { Article, ArticleSchema } from '../types/article.js';

import { fetchRealNews } from './world-news.js';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

const GeneratedArticleSchema = z.array(ArticleSchema.omit({ createdAt: true, id: true }));

const generateRealNewsPrompt = (
    newsItems: Array<{ title: string; summary: string | null }>,
) => `Based on these real news headlines, generate detailed news articles that expand on each story. Each article should be approximately 100 words long. The response MUST BE A VALID JSON and MATCH THIS FORMAT:
[
  {
    "headline": "Exact headline from input",
    "article": "A detailed ~100 word article expanding on the story",
    "category": "One of: SCIENCE, TECHNOLOGY, HEALTH, ENVIRONMENT, SPACE",
    "summary": "A concise 1-2 sentence summary of the article",
    "isFake": false
  }
]

Here are the headlines to expand:
${newsItems.map((item, i) => `${i + 1}. "${item.title}"${item.summary ? ` (Context: ${item.summary})` : ''}`).join('\n')}

Important: Keep the headlines exactly as provided and ensure each article is around 100 words. Return only valid JSON`;

const generateFakeNewsPrompt = (
    realNewsItems: Array<{ title: string; summary: string }>,
) => `Based on these real news items, generate fictional but plausible news articles that could have happened in a parallel universe. Each article should be approximately 100 words long. Each fake article should be related to one of the real articles but clearly different.

Real news for context:
${realNewsItems.map((item, i) => `${i + 1}. ${item.title} - ${item.summary}`).join('\n')}

The response MUST BE A VALID JSON and MATCH THIS FORMAT:
[
  {
    "headline": "Brief, engaging headline",
    "article": "A detailed ~100 word article about the topic",
    "category": "One of: SCIENCE, TECHNOLOGY, HEALTH, ENVIRONMENT, SPACE",
    "summary": "A concise 1-2 sentence summary of the article",
    "isFake": true
  }
]

Important: Make each article related to one of the real news items but clearly different. Ensure each article is around 100 words. Return only valid JSON`;

const generateArticleFromPrompt = async (
    model: any,
    prompt: string,
    publishDate?: string,
): Promise<Article[]> => {
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
        const articles: Article[] = [];

        // Take first 5 news items for processing
        const newsToProcess = realNews.slice(0, 5);

        // Generate all real articles in one batch
        const realArticles = await generateArticleFromPrompt(
            model,
            generateRealNewsPrompt(
                newsToProcess.map((news) => ({
                    summary: news.summary ?? null,
                    title: news.title,
                })),
            ),
            newsToProcess[0].publish_date, // Use first article's date
        );
        articles.push(...realArticles);

        // Generate all fake articles in one batch
        const fakeArticles = await generateArticleFromPrompt(
            model,
            generateFakeNewsPrompt(
                realArticles.map((article) => ({
                    summary: article.summary,
                    title: article.headline,
                })),
            ),
        );
        articles.push(...fakeArticles);

        return articles;
    } catch (error) {
        console.error('Failed to generate articles:', error);
        throw error;
    }
};
