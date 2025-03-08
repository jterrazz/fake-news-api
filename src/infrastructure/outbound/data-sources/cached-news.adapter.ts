import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import {
    FetchNewsOptions,
    NewsArticle,
    NewsPort,
} from '../../../application/ports/outbound/data-sources/news.port.js';
import { LoggerPort } from '../../../application/ports/outbound/logging/logger.port.js';

const CACHE_PATH_TEMPLATE = '/tmp/news-cache-{lang}.json';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

type CacheData = {
    timestamp: number;
    data: NewsArticle[];
};

/**
 * Decorator that adds caching behavior to any news data source
 */
export class CachedNewsAdapter implements NewsPort {
    constructor(
        private readonly newsSource: NewsPort,
        private readonly logger: LoggerPort,
    ) {}

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
            this.logger.error('Failed to read news cache', { error });
            return null;
        }
    }

    private writeCache(data: NewsArticle[], language: string): void {
        try {
            const cachePath = CACHE_PATH_TEMPLATE.replace('{lang}', language);
            const cacheData: CacheData = {
                data,
                timestamp: Date.now(),
            };
            writeFileSync(cachePath, JSON.stringify(cacheData, null, 2));
        } catch (error) {
            this.logger.error('Failed to write news cache', { error });
        }
    }

    public async fetchNews(options: FetchNewsOptions): Promise<NewsArticle[]> {
        // Try to read from cache first
        const cache = this.readCache(options.language);
        if (cache) {
            this.logger.info('Using cached news data', { language: options.language });
            return cache.data;
        }

        // If no cache or expired, fetch fresh data
        this.logger.info('Fetching fresh news data', { language: options.language });
        const articles = await this.newsSource.fetchNews(options);

        // Cache the response
        this.writeCache(articles, options.language);

        return articles;
    }
}
