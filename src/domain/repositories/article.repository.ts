import type { Article } from '@prisma/client';

export interface ArticleRepository {
    findLatest(): Promise<Article | null>;
    createMany(articles: Omit<Article, 'id' | 'createdAt'>[]): Promise<Article[]>;
    findMany(params: {
        language: string;
        category?: string;
        country?: string;
        cursor?: Date;
        limit: number;
    }): Promise<{
        items: Article[];
        total: number;
    }>;
}
