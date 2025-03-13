import type { Article } from '../../../../domain/entities/article.js';
import type { ArticleCategory } from '../../../../domain/value-objects/article-category.vo.js';
import { ArticleCountry } from '../../../../domain/value-objects/article-country.vo.js';
import { ArticleLanguage } from '../../../../domain/value-objects/article-language.vo.js';

/**
 * Parameters for finding many articles
 */
export interface FindManyParams {
    language: ArticleLanguage;
    category?: ArticleCategory;
    country: ArticleCountry;
    cursor?: Date;
    limit: number;
}

/**
 * Parameters for finding published summaries
 */
export interface FindPublishedSummariesParams {
    language: ArticleLanguage;
    country: ArticleCountry;
    since: Date;
}

/**
 * Article repository port
 */
export interface ArticleRepositoryPort {
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
    findPublishedSummaries(params: FindPublishedSummariesParams): Promise<Array<string>>;

    /**
     * Create multiple articles in a single transaction
     * @param articles Array of articles to create
     * @returns Created articles with their IDs
     */
    createMany(articles: Article[]): Promise<Article[]>;
}
