import { type Article } from '../../../../domain/entities/article.entity.js';
import { type Category } from '../../../../domain/value-objects/category.vo.js';
import { type Country } from '../../../../domain/value-objects/country.vo.js';
import { type Language } from '../../../../domain/value-objects/language.vo.js';

/**
 * Article repository port - defines how articles can be persisted and retrieved
 */
export interface ArticleRepositoryPort {
    /**
     * Count articles matching the given criteria
     */
    countMany(params: CountManyOptions): Promise<number>;

    /**
     * Create multiple articles
     */
    createMany(articles: Article[]): Promise<void>;

    /**
     * Find headlines and summaries matching the given criteria
     */
    findHeadlinesAndSummaries(
        params: FindHeadlinesAndSummariesOptions,
    ): Promise<Array<{ headline: string; summary: string }>>;

    /**
     * Find articles matching the given criteria
     */
    findMany(params: FindManyOptions): Promise<Article[]>;

    /**
     * Update an article's publication tier
     */
    update(id: string, data: { publicationTier: 'ARCHIVED' | 'NICHE' | 'STANDARD' }): Promise<void>;
}

export interface CountManyOptions {
    category?: Category;
    country?: Country;
    endDate?: Date;
    language?: Language;
    startDate?: Date;
}

export interface FindHeadlinesAndSummariesOptions {
    country: Country;
    language: Language;
    since?: Date;
}

export interface FindManyOptions {
    category?: Category;
    country?: Country;
    cursor?: Date;
    language?: Language;
    limit: number;
    where?: {
        publicationTier?: 'PENDING_REVIEW';
    };
}
