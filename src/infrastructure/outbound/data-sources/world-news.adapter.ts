import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';

import { ConfigurationPort } from '../../../application/ports/inbound/configuration.port.js';

import {
    FetchNewsOptions,
    NewsArticle,
    NewsPort,
} from '../../../application/ports/outbound/data-sources/news.port.js';

const CACHE_PATH_TEMPLATE = '/tmp/world-news-cache-{lang}.json';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
const RATE_LIMIT_DELAY = 1200; // 1.2 seconds between requests for safety margin

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

export class WorldNewsAdapter implements NewsPort {
    private lastRequestTime = 0;
    private logger: Console;

    constructor(
        private readonly config: ConfigurationPort,
        logger: Console = console,
    ) {
        this.logger = logger;
    }

    private async enforceRateLimit(): Promise<void> {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
            await new Promise((resolve) =>
                setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest),
            );
        }

        this.lastRequestTime = Date.now();
    }

    private readCache(language: string): CacheData | null {
        try {
            const cachePath = CACHE_PATH_TEMPLATE.replace('{lang}', language);
            if (!existsSync(cachePath)) return null;

            const cacheContent = readFileSync(cachePath, 'utf-8');
            const cache = JSON.parse(cacheContent) as CacheData;

            // Check if cache is still valid
            if (Date.now() - cache.timestamp > CACHE_TTL) return null;

            return cache;
        } catch (error) {
            this.logger.error('Failed to read cache:', error);
            return null;
        }
    }

    private writeCache(data: z.infer<typeof WorldNewsResponseSchema>, language: string): void {
        try {
            const cachePath = CACHE_PATH_TEMPLATE.replace('{lang}', language);
            const cacheData: CacheData = {
                data,
                timestamp: Date.now(),
            };
            writeFileSync(cachePath, JSON.stringify(cacheData, null, 2));
        } catch (error) {
            this.logger.error('Failed to write cache:', error);
        }
    }

    public async fetchNews({ language, sourceCountry }: FetchNewsOptions): Promise<NewsArticle[]> {
        try {
            // Try to read from cache first
            const cache = this.readCache(language);
            if (cache) {
                this.logger.info(`Using cached news data for ${language}`);
                return this.transformResponse(cache.data);
            }

            this.logger.info(`Fetching fresh news data for ${language}`);
            await this.enforceRateLimit();

            const today = new Date().toISOString().split('T')[0];
            const url = new URL('https://api.worldnewsapi.com/top-news');

            // Add query parameters
            url.searchParams.append('api-key', this.config.getApiConfiguration().worldNews.apiKey);
            url.searchParams.append('source-country', sourceCountry);
            url.searchParams.append('language', language);
            url.searchParams.append('date', today);

            const response = await fetch(url.toString());

            if (!response.ok) {
                this.logger.error('Failed to fetch news:', response.statusText);
                return [];
            }

            const data = await response.json();
            const parsed = WorldNewsResponseSchema.parse(data);

            // Cache the response
            this.writeCache(parsed, language);

            return this.transformResponse(parsed);
        } catch (error) {
            this.logger.error(`Failed to fetch ${language} news:`, error);
            return [];
        }
    }

    private transformResponse(response: z.infer<typeof WorldNewsResponseSchema>): NewsArticle[] {
        return response.top_news
            .map((section) => section.news[0])
            .map((article) => ({
                publishDate: article.publish_date,
                summary: article.summary ?? article.text,
                title: article.title,
                url: article.url ?? '',
            }));
    }
}
