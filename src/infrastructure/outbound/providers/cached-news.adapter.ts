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

// Constants
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
const DEFAULT_LANGUAGE = 'en';
const CACHE_FILE_ENCODING = 'utf-8';
const JSON_INDENT = 2;

// Helper functions
const getCacheDir = (env: string) => `${tmpdir()}/fake-news/${env}`;
const getCachePath = (env: string, lang: string) => `${getCacheDir(env)}/articles/${lang}.json`;

// Types
type CacheData = z.infer<typeof cacheDataSchema>;

// Schemas
const newsArticleSchema = z.object({
    body: z.string(),
    coverage: z.number(),
    headline: z.string(),
    publishedAt: z.iso.datetime().transform((date) => new Date(date)),
});

const cacheDataSchema = z.object({
    data: z.array(newsArticleSchema),
    timestamp: z.number(),
});

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
        const language = options.language?.toString() ?? DEFAULT_LANGUAGE;

        const cachedData = this.readCache(language);
        if (cachedData) {
            this.logger.info('Using cached news data', { language });
            return cachedData.data;
        }

        this.logger.info('Fetching fresh news data', { language });
        const articles = await this.newsSource.fetchNews(options);
        this.writeCache(articles, language);

        return articles;
    }

    private ensureDirectoryExists(filePath: string): void {
        const directory = dirname(filePath);
        if (!existsSync(directory)) {
            mkdirSync(directory, { recursive: true });
        }
    }

    private isCacheExpired(timestamp: number): boolean {
        return Date.now() - timestamp > CACHE_TTL;
    }

    private readCache(language: string): CacheData | null {
        try {
            const cachePath = getCachePath(this.cacheDirectory, language);

            if (!existsSync(cachePath)) {
                return null;
            }

            const cacheContent = readFileSync(cachePath, CACHE_FILE_ENCODING);
            const parsedCache = JSON.parse(cacheContent);
            const cache = cacheDataSchema.parse(parsedCache);

            if (this.isCacheExpired(cache.timestamp)) {
                return null;
            }

            return cache;
        } catch (error) {
            this.logger.error('Failed to read news cache', { error, language });
            return null;
        }
    }

    private writeCache(data: NewsArticle[], language: string): void {
        try {
            const cachePath = getCachePath(this.cacheDirectory, language);
            this.ensureDirectoryExists(cachePath);

            const cacheData: CacheData = {
                data,
                timestamp: Date.now(),
            };

            writeFileSync(cachePath, JSON.stringify(cacheData, null, JSON_INDENT));
        } catch (error) {
            this.logger.error('Failed to write news cache', { error, language });
        }
    }
}
