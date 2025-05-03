import { type LoggerPort } from '@jterrazz/logger';
import { type MonitoringPort } from '@jterrazz/monitoring';
import { z } from 'zod';

import {
    type FetchNewsOptions as FetchTopNewsOptions,
    type NewsArticle,
    type NewsPort,
} from '../../../application/ports/outbound/data-sources/news.port.js';

import { ArticleCountry, CountryEnum } from '../../../domain/value-objects/article-country.vo.js';
import {
    ArticleLanguage,
    LanguageEnum,
} from '../../../domain/value-objects/article-language.vo.js';

import {
    createCurrentTZDateForCountry,
    formatTZDateInCountry,
} from '../../../shared/date/timezone.js';

const RATE_LIMIT_DELAY = 1200; // 1.2 seconds between requests for safety margin

export interface WorldNewsAdapterConfiguration {
    apiKey: string;
}

const WorldNewsArticleSchema = z.object({
    publish_date: z.string(),
    text: z.string(),
    title: z.string(),
});

const WorldNewsResponseSchema = z.object({
    country: z.string(),
    language: z.string(),
    top_news: z.array(
        z.object({
            news: z.array(WorldNewsArticleSchema),
        }),
    ),
});

export class WorldNewsAdapter implements NewsPort {
    private lastRequestTime = 0;

    constructor(
        private readonly configuration: WorldNewsAdapterConfiguration,
        private readonly logger: LoggerPort,
        private readonly monitoring: MonitoringPort,
    ) {}

    public async fetchTopNews(options?: FetchTopNewsOptions): Promise<NewsArticle[]> {
        const {
            country = ArticleCountry.create(CountryEnum.UnitedStates),
            language = ArticleLanguage.create(LanguageEnum.English),
        } = options || {};
        return this.monitoring.monitorSegment('Api/WorldNews/FetchTopNews', async () => {
            try {
                this.logger.info('Retrieving news articles:', {
                    country: country.toString(),
                    language: language.toString(),
                });
                await this.enforceRateLimit();

                const { tzDate } = createCurrentTZDateForCountry(country.toString());
                const countryDate = formatTZDateInCountry(tzDate, country.toString(), 'yyyy-MM-dd');
                const url = new URL('https://api.worldnewsapi.com/top-news');

                // Add query parameters
                url.searchParams.append('api-key', this.configuration.apiKey);
                url.searchParams.append('source-country', country.toString());
                url.searchParams.append('language', language.toString());
                url.searchParams.append('date', countryDate);

                this.logger.info('Fetching news with date', {
                    country: country.toString(),
                    countryDate,
                });

                const response = await fetch(url.toString());

                if (!response.ok) {
                    this.monitoring.recordCount('WorldNews', 'Errors');
                    this.logger.error('Failed to fetch news:', {
                        status: response.status,
                        statusText: response.statusText,
                    });
                    return [];
                }

                const data = await response.json();
                const parsed = WorldNewsResponseSchema.parse(data);
                const articles = this.transformResponse(parsed);

                this.logger.info('Successfully retrieved news articles:', {
                    articleCount: articles.length,
                    country: country.toString(),
                    language: language.toString(),
                });

                return articles;
            } catch (error) {
                this.monitoring.recordCount('WorldNews', 'Errors');
                this.logger.error(`Failed to fetch ${language} news:`, {
                    country: country.toString(),
                    error,
                    language: language.toString(),
                });
                return [];
            }
        });
    }

    private async enforceRateLimit(): Promise<void> {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
            const waitTime = RATE_LIMIT_DELAY - timeSinceLastRequest;
            this.monitoring.recordMeasurement('WorldNews/RateLimit', 'WaitTime', waitTime);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
        }

        this.lastRequestTime = Date.now();
    }

    private transformResponse(response: z.infer<typeof WorldNewsResponseSchema>): NewsArticle[] {
        const articlesWithCount = response.top_news.map((section) => ({
            ...section.news[0],
            publishedCount: section.news.length,
        }));

        // Sort descending by publishedCount
        const sortedByCount = [...articlesWithCount].sort(
            (a, b) => b.publishedCount - a.publishedCount,
        );
        const top30PercentIndex = Math.ceil(sortedByCount.length * 0.21) - 1;
        const threshold = sortedByCount[top30PercentIndex]?.publishedCount ?? 0;

        return articlesWithCount
            .filter((article) => article.publishedCount > 5 || article.publishedCount >= threshold)
            .map((article) => ({
                publishedAt: new Date(article.publish_date),
                text: article.text,
                title: article.title,
            }));
    }
}
