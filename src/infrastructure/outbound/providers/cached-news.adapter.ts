import { type LoggerPort } from '@jterrazz/logger';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname } from 'node:path';
import { z } from 'zod/v4';

import {
    type NewsArticle,
    type NewsOptions,
    type NewsProviderPort,
} from '../../../application/ports/outbound/providers/news.port.js';

const CACHE_DIR = (env: string) => `${tmpdir()}/fake-news/${env}`;
const CACHE_PATH_TEMPLATE = (env: string, lang: string) =>
    `${CACHE_DIR(env)}/articles/${lang}.json`;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

const newsArticleSchema = z.object({
    coverage: z.number(),
    headline: z.string(),
    publishedAt: z
        .string()
        .datetime()
        .transform((date) => new Date(date)),
    text: z.string(),
});

const CacheDataSchema = z.object({
    data: z.array(newsArticleSchema),
    timestamp: z.number(),
});

type CacheData = z.infer<typeof CacheDataSchema>;

/**
 * Decorator that adds caching behavior to any news data source
 */
export class CachedNewsAdapter implements NewsProviderPort {
    constructor(
        private readonly newsSource: NewsProviderPort,
        private readonly logger: LoggerPort,
        private readonly cacheDirectory: string,
    ) {}

    public async fetchNews(options: NewsOptions): Promise<NewsArticle[]> {
        const language = options.language?.toString() ?? 'en';
        // Try to read from cache first
        const cache = this.readCache(language);
        if (cache) {
            this.logger.info('Using cached news data', { language });
            return cache.data;
        }

        // If no cache or expired, fetch fresh data
        this.logger.info('Fetching fresh news data', { language });
        const articles = await this.newsSource.fetchNews(options);

        // Cache the response
        this.writeCache(articles, language);

        return articles;
    }

    private ensureDirectoryExists(filePath: string): void {
        const directory = dirname(filePath);
        if (!existsSync(directory)) {
            mkdirSync(directory, { recursive: true });
        }
    }

    private readCache(language: string): CacheData | null {
        try {
            const cachePath = CACHE_PATH_TEMPLATE(this.cacheDirectory, language);
            if (!existsSync(cachePath)) return null;

            const cacheContent = readFileSync(cachePath, 'utf-8');
            const parsedCache = JSON.parse(cacheContent);
            const cache = CacheDataSchema.parse(parsedCache);

            // Check if cache is still valid
            if (Date.now() - cache.timestamp > CACHE_TTL) return null;

            return cache;
        } catch (error) {
            this.logger.error('Failed to read news cache', { error });
            return null;
        }
    }

    private writeCache(data: NewsArticle[], language: string): void {
        try {
            const cachePath = CACHE_PATH_TEMPLATE(this.cacheDirectory, language);
            this.ensureDirectoryExists(cachePath);

            const cacheData: CacheData = {
                data,
                timestamp: Date.now(),
            };
            writeFileSync(cachePath, JSON.stringify(cacheData, null, 2));
        } catch (error) {
            this.logger.error('Failed to write news cache', { error });
        }
    }
}
