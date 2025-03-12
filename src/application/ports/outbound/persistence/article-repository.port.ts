import type { Article } from '../../../../domain/entities/article.js';
import type {
    ArticleCategory,
    ArticleCountry,
    ArticleLanguage,
} from '../../../../domain/value-objects/article-category.vo.js';

export interface ArticleRepository {
    findLatest(): Promise<Article | null>;
    findById(id: string): Promise<Article | null>;
    findMany(params: {
        language: ArticleLanguage;
        category?: ArticleCategory;
        country?: ArticleCountry;
        cursor?: Date;
        limit: number;
    }): Promise<{
        items: Article[];
        total: number;
    }>;
    findPublishedSummaries(params: {
        language: ArticleLanguage;
        country: ArticleCountry;
        since: Date;
    }): Promise<Array<string>>;
    createMany(articles: Omit<Article, 'id' | 'createdAt'>[]): Promise<Article[]>;
    update(article: Article): Promise<void>;
}
