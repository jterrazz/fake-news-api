import { type LoggerPort } from '@jterrazz/logger';
import { existsSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname } from 'node:path';
import { z } from 'zod/v4';

import {
    type NewsOptions,
    type NewsProviderPort,
    type NewsStory,
} from '../../../application/ports/outbound/providers/news.port.js';

// Constants
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
const DEFAULT_LANGUAGE = 'en';
const CACHE_FILE_ENCODING = 'utf-8';
const JSON_INDENT = 2;

// Helper functions
const getCacheDir = (env: string) => `${tmpdir()}/fake-news/${env}`;
const getCachePath = (env: string, lang: string) => `${getCacheDir(env)}/stories/${lang}.json`;

// Types
type CacheData = z.infer<typeof cacheDataSchema>;

// Schemas
const newsArticleSchema = z.object({
    body: z.string(),
    headline: z.string(),
    id: z.string(),
});

const newsStorySchema = z.object({
    articles: z.array(newsArticleSchema),
    publishedAt: z.iso.datetime().transform((date) => new Date(date)),
});

const cacheDataSchema = z.object({
    data: z.array(newsStorySchema),
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

    public async fetchNews(options?: NewsOptions): Promise<NewsStory[]> {
        const language = options?.language?.toString() ?? DEFAULT_LANGUAGE;

        this.logger.info('Checking cache for news data', { language });

        const cachedData = this.readCache(language);
        if (cachedData) {
            this.logger.info('Cache hit - using cached news data', {
                cacheAge: Date.now() - cachedData.timestamp,
                language,
                storyCount: cachedData.data.length,
            });
            return cachedData.data;
        }

        this.logger.info('Cache miss - fetching fresh news data', { language });
        const stories = await this.newsSource.fetchNews(options);

        this.logger.info('Writing fresh data to cache', {
            language,
            storyCount: stories.length,
        });
        this.writeCache(stories, language);

        return stories;
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

    private writeCache(data: NewsStory[], language: string): void {
        try {
            const cachePath = getCachePath(this.cacheDirectory, language);
            this.ensureDirectoryExists(cachePath);

            const cacheData: CacheData = {
                data,
                timestamp: Date.now(),
            };

            writeFileSync(cachePath, JSON.stringify(cacheData, null, JSON_INDENT));

            this.logger.info('Successfully wrote cache file', {
                cachePath,
                cacheSize: JSON.stringify(cacheData).length,
                language,
                storyCount: data.length,
            });
        } catch (error) {
            this.logger.error('Failed to write news cache', { error, language });
        }
    }
}
