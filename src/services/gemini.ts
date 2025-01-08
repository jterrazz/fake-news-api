import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

import { env } from '../config/env.js';
import { Article, ArticleSchema } from '../types/article.js';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

const GeneratedArticleSchema = z.array(ArticleSchema.omit({ createdAt: true, id: true })).length(5);

const ARTICLE_PROMPT = `Generate 5 news articles in a JSON array format. The response MUST BE A VALID JSON and MATCH EXACTLY THIS FORMAT:
[
  {
    "headline": "Brief, engaging headline for article 1",
    "article": "A detailed paragraph about the topic",
    "category": "One of: SCIENCE, TECHNOLOGY, HEALTH, ENVIRONMENT, SPACE",
    "isFake": boolean indicating if this is a fictional story
  },
  // ... 4 more articles with the same structure
]

Important: Ensure the response is a valid JSON array containing exactly 5 articles. Do not format this in markdown, just return the JSON array.`;

export const generateArticles = async (): Promise<Article[]> => {
    try {
        // gemini-1.5-pro - gemini-pro
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
        const result = await model.generateContent(ARTICLE_PROMPT);
        console.log(result);
        console.log(JSON.stringify(result, null, 2));
        const text = result.response.text();

        if (!text) throw new Error('Failed to generate articles');

        const parsedArticles = GeneratedArticleSchema.parse(JSON.parse(text));

        return parsedArticles.map((article) => ({
            ...article,
            createdAt: new Date(),
            id: crypto.randomUUID(),
        }));
    } catch (error) {
        console.error('Failed to generate articles:', error);
        throw error;
    }
};
