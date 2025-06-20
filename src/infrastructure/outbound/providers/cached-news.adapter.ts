import { type LoggerPort } from '@jterrazz/logger';
import { existsSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
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
    ) {
        const cacheDir = getCacheDir(this.cacheDirectory);
        this.logger.info('Initializing CachedNewsAdapter', {
            cacheDir,
            cacheDirectory: this.cacheDirectory,
            ttl: CACHE_TTL,
        });
    }

    /**
     * Clear all cached data for debugging purposes
     */
    public clearAllCache(): void {
        try {
            const cacheDir = getCacheDir(this.cacheDirectory);
            if (existsSync(cacheDir)) {
                rmSync(cacheDir, { force: true, recursive: true });
                this.logger.info('All cache data cleared', { cacheDir });
            }
        } catch (error) {
            this.logger.error('Failed to clear cache directory', { error });
        }
    }

    public async fetchNews(options: NewsOptions): Promise<NewsArticle[]> {
        const language = options.language?.toString() ?? DEFAULT_LANGUAGE;

        this.logger.info('Checking cache for news data', { language });

        const cachedData = this.readCache(language);
        if (cachedData) {
            this.logger.info('Cache hit - using cached news data', {
                articleCount: cachedData.data.length,
                cacheAge: Date.now() - cachedData.timestamp,
                language,
            });
            return cachedData.data;
        }

        this.logger.info('Cache miss - fetching fresh news data', { language });
        const articles = await this.newsSource.fetchNews(options);

        this.logger.info('Writing fresh data to cache', {
            articleCount: articles.length,
            language,
        });
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

            // Check if file is empty or contains invalid JSON
            if (!cacheContent.trim()) {
                this.logger.warn('Cache file is empty, removing it', { cachePath, language });
                this.removeCache(cachePath);
                return null;
            }

            const parsedCache = JSON.parse(cacheContent);
            const cache = cacheDataSchema.parse(parsedCache);

            if (this.isCacheExpired(cache.timestamp)) {
                this.logger.info('Cache expired, removing it', { cachePath, language });
                this.removeCache(cachePath);
                return null;
            }

            return cache;
        } catch (error) {
            const cachePath = getCachePath(this.cacheDirectory, language);
            this.logger.error('Failed to read news cache, removing corrupted cache', {
                cachePath,
                error,
                language,
            });
            this.removeCache(cachePath);
            return null;
        }
    }

    private removeCache(cachePath: string): void {
        try {
            if (existsSync(cachePath)) {
                unlinkSync(cachePath);
            }
        } catch (error) {
            this.logger.error('Failed to remove corrupted cache file', { cachePath, error });
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

            this.logger.info('Successfully wrote cache file', {
                articleCount: data.length,
                cachePath,
                cacheSize: JSON.stringify(cacheData).length,
                language,
            });
        } catch (error) {
            this.logger.error('Failed to write news cache', { error, language });
        }
    }
}
