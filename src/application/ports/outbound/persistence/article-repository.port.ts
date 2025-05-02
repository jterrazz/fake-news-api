import type { Article } from '../../../../domain/entities/article.entity.js';
import type { ArticleCategory } from '../../../../domain/value-objects/article-category.vo.js';
import { type ArticleCountry } from '../../../../domain/value-objects/article-country.vo.js';
import { type ArticleLanguage } from '../../../../domain/value-objects/article-language.vo.js';

/**
 * Article repository port
 */
export interface ArticleRepositoryPort {
    /**
     * Count articles for a specific day
     */
    countManyForDay(params: CountArticlesForDayParams): Promise<number>;

    /**
     * Create multiple articles in a single transaction
     * @param articles Array of articles to create
     * @returns Created articles with their IDs
     */
    createMany(articles: Article[]): Promise<Article[]>;

    /**
     * Find many articles
     */
    findMany(params: FindManyParams): Promise<{
        items: Article[];
        total: number;
    }>;

    /**
     * Find published article summaries since a given date
     */
    findPublishedSummaries(
        params: FindPublishedSummariesParams,
    ): Promise<Array<{ headline: string; summary: string }>>;
}

/**
 * Parameters for counting articles for a specific day
 */
export interface CountArticlesForDayParams {
    country: ArticleCountry;
    date: Date;
    language: ArticleLanguage;
}

/**
 * Parameters for finding many articles
 */
export interface FindManyParams {
    category?: ArticleCategory;
    country: ArticleCountry;
    cursor?: Date;
    language?: ArticleLanguage;
    limit: number;
}

/**
 * Parameters for finding published summaries
 */
export interface FindPublishedSummariesParams {
    country: ArticleCountry;
    language: ArticleLanguage;
    since: Date;
}
