import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';

import { env } from '../config/env.js';

const CACHE_PATH_TEMPLATE = '/tmp/world-news-cache-{lang}.json';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
const RATE_LIMIT_DELAY = 1200; // 1.2 seconds between requests for safety margin

let lastRequestTime = 0;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const enforceRateLimit = async () => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
        await delay(RATE_LIMIT_DELAY - timeSinceLastRequest);
    }

    lastRequestTime = Date.now();
};

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

const readCache = (language: string): CacheData | null => {
    try {
        const cachePath = CACHE_PATH_TEMPLATE.replace('{lang}', language);
        if (!existsSync(cachePath)) return null;

        const cacheContent = readFileSync(cachePath, 'utf-8');
        const cache = JSON.parse(cacheContent) as CacheData;

        // Check if cache is still valid
        if (Date.now() - cache.timestamp > CACHE_TTL) return null;

        return cache;
    } catch (error) {
        console.error('Failed to read cache:', error);
        return null;
    }
};

const writeCache = (data: z.infer<typeof WorldNewsResponseSchema>, language: string) => {
    try {
        const cachePath = CACHE_PATH_TEMPLATE.replace('{lang}', language);
        const cacheData: CacheData = {
            data,
            timestamp: Date.now(),
        };
        writeFileSync(cachePath, JSON.stringify(cacheData, null, 2));
    } catch (error) {
        console.error('Failed to write cache:', error);
    }
};

type FetchRealNewsOptions = {
    language: 'en' | 'fr';
    sourceCountry: 'us' | 'fr';
};

export const fetchRealNews = async (
    { language = 'en', sourceCountry = 'us' }: FetchRealNewsOptions = {
        language: 'en',
        sourceCountry: 'us',
    },
): Promise<z.infer<typeof WorldNewsArticleSchema>[]> => {
    try {
        // Try to read from cache first
        const cache = readCache(language);
        if (cache) {
            console.log(`Using cached news data for ${language}`);
            // Take only the first news article from each section
            return cache.data.top_news.map((section) => section.news[0]);
        }

        console.log(`Fetching fresh news data for ${language}`);
        await enforceRateLimit();

        const today = new Date().toISOString().split('T')[0];
        const url = new URL('https://api.worldnewsapi.com/top-news');

        // Add all query parameters
        url.searchParams.append('api-key', env.WORLD_NEWS_API_KEY);
        url.searchParams.append('source-country', sourceCountry);
        url.searchParams.append('language', language);
        url.searchParams.append('date', today);

        const response = await fetch(url.toString());

        if (!response.ok) throw new Error(`API request failed: ${response.statusText}`);

        const data = await response.json();
        const parsed = WorldNewsResponseSchema.parse(data);

        // Cache the response
        writeCache(parsed, language);

        // Take only the first news article from each section
        return parsed.top_news.map((section) => section.news[0]);
    } catch (error) {
        console.error(`Failed to fetch ${language} news:`, JSON.stringify(error, null, 2));
        throw error;
    }
};
