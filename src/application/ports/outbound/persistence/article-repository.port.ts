import { type Article } from '../../../../domain/entities/article.entity.js';
import { type Category } from '../../../../domain/value-objects/category.vo.js';
import { type Country } from '../../../../domain/value-objects/country.vo.js';
import { type Language } from '../../../../domain/value-objects/language.vo.js';

/**
 * Article repository port
 */
export interface ArticleRepositoryPort {
    /**
     * Count articles for a specific day
     */
    countManyForDay(options: FindPublishedSummariesOptions): Promise<number>;

    /**
     * Create multiple articles in a single transaction
     * @param articles Array of articles to create
     * @returns Created articles with their IDs
     */
    createMany(articles: Article[]): Promise<SaveArticlesResult>;

    /**
     * Find many articles
     */
    findMany(options: FindManyOptions): Promise<FindManyResult>;

    /**
     * Find published article summaries since a given date
     */
    findPublishedSummaries(
        options: FindPublishedSummariesOptions,
    ): Promise<Array<{ headline: string; summary: string }>>;
}

export interface FindManyOptions {
    category?: Category;
    country: Country;
    cursor?: Date;
    language?: Language;
    limit: number;
}

export interface FindManyResult {
    items: Article[];
    total: number;
}

export interface FindPublishedSummariesOptions {
    country: Country;
    language: Language;
}

export interface SaveArticlesResult {
    articlesCount: number;
}
