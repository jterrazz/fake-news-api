import { z } from 'zod/v4';

import { type Country } from '../../../../domain/value-objects/country.vo.js';
import { type Language } from '../../../../domain/value-objects/language.vo.js';

export const NewsArticleSchema = z.object({
    publishedAt: z
        .string()
        .datetime()
        .transform((date) => new Date(date)),
    publishedCount: z.number(),
    text: z.string(),
    title: z.string(),
});

/**
 * Options for fetching news articles
 */
export interface FetchNewsOptions {
    country?: Country;
    language?: Language;
}

export type NewsArticle = z.output<typeof NewsArticleSchema>;

/**
 * News data source port - defines how to fetch news articles from external providers
 */
export interface NewsPort {
    /**
     * Fetch news articles based on language and country
     */
    fetchTopNews(options?: FetchNewsOptions): Promise<NewsArticle[]>;
}
