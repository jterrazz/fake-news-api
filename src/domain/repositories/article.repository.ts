import type { Article, Country, Language } from '@prisma/client';

export interface ArticleRepository {
    findLatest(): Promise<Article | null>;
    createMany(articles: Omit<Article, 'id' | 'createdAt'>[]): Promise<Article[]>;
    findMany(params: {
        language: Language;
        category?: string;
        country?: Country;
        cursor?: Date;
        limit: number;
    }): Promise<{
        items: Article[];
        total: number;
    }>;
    findRecentArticles(params: {
        language: Language;
        country: Country;
        since: Date;
    }): Promise<Array<{ headline: string; summary: string }>>;
}
