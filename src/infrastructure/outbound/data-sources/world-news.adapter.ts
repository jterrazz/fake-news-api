import { z } from 'zod';

import { ConfigurationPort } from '../../../application/ports/inbound/configuration.port.js';

import {
    FetchNewsOptions,
    NewsArticle,
    NewsPort,
} from '../../../application/ports/outbound/data-sources/news.port.js';
import { LoggerPort } from '../../../application/ports/outbound/logging/logger.port.js';

import { formatInTimezone, getTimezoneForCountry } from '../../../shared/date/timezone.js';
import { NewRelicAdapter } from '../monitoring/new-relic.adapter.js';

const RATE_LIMIT_DELAY = 1200; // 1.2 seconds between requests for safety margin

const WorldNewsArticleSchema = z.object({
    publish_date: z.string(),
    summary: z.string().nullish(),
    text: z.string(),
    title: z.string(),
    url: z.string(),
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
        private readonly config: ConfigurationPort,
        private readonly logger: LoggerPort,
        private readonly monitoring: NewRelicAdapter,
    ) {}

    private async enforceRateLimit(): Promise<void> {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
            const waitTime = RATE_LIMIT_DELAY - timeSinceLastRequest;
            this.monitoring.recordMetric('Custom/WorldNews/RateLimit/WaitTime', waitTime);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
        }

        this.lastRequestTime = Date.now();
    }

    /**
     * Gets the current date in the timezone of the specified country
     */
    private getDateForCountry(countryCode: string): string {
        const timezone = getTimezoneForCountry(countryCode);
        return formatInTimezone(new Date(), timezone, 'yyyy-MM-dd');
    }

    public async fetchNews({ language, country }: FetchNewsOptions): Promise<NewsArticle[]> {
        return this.monitoring.monitorSegment('External/WorldNewsAPI/Fetch', async () => {
            try {
                this.logger.info('Retrieving news articles:', { country, language });
                await this.enforceRateLimit();

                const countryDate = this.getDateForCountry(country.toString());
                const url = new URL('https://api.worldnewsapi.com/top-news');

                // Add query parameters
                url.searchParams.append(
                    'api-key',
                    this.config.getApiConfiguration().worldNews.apiKey,
                );
                url.searchParams.append('source-country', country.toString());
                url.searchParams.append('language', language.toString());
                url.searchParams.append('date', countryDate);

                this.logger.info('Fetching news with date', {
                    country: country.toString(),
                    countryDate,
                });

                const response = await fetch(url.toString());

                if (!response.ok) {
                    this.monitoring.incrementMetric('Custom/WorldNews/Errors/Http');
                    this.logger.error('Failed to fetch news:', {
                        status: response.status,
                        statusText: response.statusText,
                    });
                    return [];
                }

                const data = await response.json();
                const parsed = WorldNewsResponseSchema.parse(data);
                const articles = this.transformResponse(parsed);

                this.monitoring.recordMetric('Custom/WorldNews/Articles/Count', articles.length);
                this.logger.info('Successfully retrieved news articles:', {
                    articleCount: articles.length,
                    country,
                    language,
                });

                return articles;
            } catch (error) {
                this.monitoring.incrementMetric('Custom/WorldNews/Errors/General');
                this.logger.error(`Failed to fetch ${language} news:`, {
                    country,
                    error,
                    language,
                });
                return [];
            }
        });
    }

    private transformResponse(response: z.infer<typeof WorldNewsResponseSchema>): NewsArticle[] {
        return response.top_news
            .map((section) => section.news[0])
            .map((article) => ({
                publishedAt: new Date(article.publish_date),
                summary: article.summary ?? article.text,
                title: article.title,
                url: article.url,
            }));
    }
}
