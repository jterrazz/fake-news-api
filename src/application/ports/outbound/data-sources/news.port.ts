import { z } from 'zod';

import { type ArticleCountry } from '../../../../domain/value-objects/article-country.vo.js';
import { type ArticleLanguage } from '../../../../domain/value-objects/article-language.vo.js';

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
    country?: ArticleCountry;
    language?: ArticleLanguage;
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
