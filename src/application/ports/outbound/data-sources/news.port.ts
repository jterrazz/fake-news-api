import { z } from 'zod';

import { ArticleCountry } from '../../../../domain/value-objects/article-country.vo.js';
import { ArticleLanguage } from '../../../../domain/value-objects/article-language.vo.js';

export const NewsArticleSchema = z.object({
    publishedAt: z
        .string()
        .datetime()
        .transform((date) => new Date(date)),
    summary: z.string(),
    title: z.string(),
    url: z.string(),
});

export type NewsArticle = z.output<typeof NewsArticleSchema>;

/**
 * Options for fetching news articles
 */
export interface FetchNewsOptions {
    language: ArticleLanguage;
    country: ArticleCountry;
}

/**
 * News data source port - defines how to fetch news articles from external providers
 */
export interface NewsPort {
    /**
     * Fetch news articles based on language and country
     */
    fetchNews(options: FetchNewsOptions): Promise<NewsArticle[]>;
}
