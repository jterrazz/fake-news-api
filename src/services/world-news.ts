import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';

import { env } from '../config/env.js';

const CACHE_PATH = '/tmp/world-news-cache.json';
const CACHE_TTL = 15 * 60 * 1000; // 5 minutes in milliseconds

const WorldNewsArticleSchema = z
    .object({
        author: z.string().nullish(),
        authors: z.array(z.string()).nullish(),
        category: z.string().nullish(),
        id: z.number(),
        image: z.string().nullish(),
        language: z.string().nullish(),
        publish_date: z.string(),
        sentiment: z.number().nullish(),
        source_country: z.string().nullish(),
        summary: z.string().nullish(),
        text: z.string(),
        title: z.string(),
        url: z.string().nullish(),
        video: z.string().nullish(),
    })
    .transform((article) => ({
        ...article,
        author: article.author ?? 'Unknown',
        authors: article.authors ?? [],
        language: article.language ?? 'en',
        source_country: article.source_country ?? 'unknown',
    }));

const WorldNewsResponseSchema = z.object({
    country: z.string(),
    language: z.string(),
    top_news: z.array(
        z.object({
            news: z.array(WorldNewsArticleSchema),
        }),
    ),
});

type CacheData = {
    timestamp: number;
    data: z.infer<typeof WorldNewsResponseSchema>;
};

const readCache = (): CacheData | null => {
    try {
        if (!existsSync(CACHE_PATH)) return null;

        const cacheContent = readFileSync(CACHE_PATH, 'utf-8');
        const cache = JSON.parse(cacheContent) as CacheData;

        // Check if cache is still valid
        if (Date.now() - cache.timestamp > CACHE_TTL) return null;

        return cache;
    } catch (error) {
        console.error('Failed to read cache:', error);
        return null;
    }
};

const writeCache = (data: z.infer<typeof WorldNewsResponseSchema>) => {
    try {
        const cacheData: CacheData = {
            data,
            timestamp: Date.now(),
        };
        writeFileSync(CACHE_PATH, JSON.stringify(cacheData, null, 2));
    } catch (error) {
        console.error('Failed to write cache:', error);
    }
};

export const fetchRealNews = async (): Promise<z.infer<typeof WorldNewsArticleSchema>[]> => {
    try {
        // Try to read from cache first
        const cache = readCache();
        if (cache) {
            console.log('Using cached news data');
            // Take only the first news article from each section
            return cache.data.top_news.map((section) => section.news[0]);
        }

        console.log('Fetching fresh news data');
        const today = new Date().toISOString().split('T')[0];
        const url = new URL('https://api.worldnewsapi.com/top-news');

        // Add all query parameters
        url.searchParams.append('api-key', env.WORLD_NEWS_API_KEY);
        url.searchParams.append('source-country', 'us');
        url.searchParams.append('language', 'en');
        url.searchParams.append('date', today);

        const response = await fetch(url.toString());

        if (!response.ok) throw new Error(`API request failed: ${response.statusText}`);

        const data = await response.json();
        const parsed = WorldNewsResponseSchema.parse(data);

        // Cache the response
        writeCache(parsed);

        // Take only the first news article from each section
        return parsed.top_news.map((section) => section.news[0]);
    } catch (error) {
        console.error('Failed to fetch real news:', JSON.stringify(error, null, 2));
        throw error;
    }
};
