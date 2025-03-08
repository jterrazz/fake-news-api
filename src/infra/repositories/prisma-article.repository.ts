import type { Article, Category, Country, Language, Prisma } from '@prisma/client';

import type { ArticleRepository } from '../../domain/repositories/article.repository.js';

import type { DatabaseClient } from '../database/client.js';

export class PrismaArticleRepository implements ArticleRepository {
    constructor(private readonly db: DatabaseClient) {}

    async findLatest(): Promise<Article | null> {
        return this.db.prisma.article.findFirst({
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async createMany(articles: Omit<Article, 'id' | 'createdAt'>[]): Promise<Article[]> {
        await this.db.prisma.article.createMany({
            data: articles,
        });

        // Fetch the created articles to return them
        return this.db.prisma.article.findMany({
            where: {
                article: {
                    in: articles.map((a) => a.article),
                },
            },
        });
    }

    async findMany(params: {
        language: Language;
        category?: Category;
        country?: Country;
        cursor?: Date;
        limit: number;
    }): Promise<{
        items: Article[];
        total: number;
    }> {
        const { language, category, country, cursor, limit } = params;

        // Build where conditions
        const where: Prisma.ArticleWhereInput = {
            AND: [
                { language },
                ...(cursor ? [{ createdAt: { lt: cursor } }] : []),
                ...(category ? [{ category }] : []),
                ...(country ? [{ country }] : []),
            ],
        };

        // Get total count
        const total = await this.db.prisma.article.count({ where });

        // Fetch items
        const items = await this.db.prisma.article.findMany({
            orderBy: {
                createdAt: 'desc',
            },
            take: limit + 1,
            where,
        });

        return {
            items: items.slice(0, limit),
            total,
        };
    }

    async findRecentArticles(params: {
        language: Language;
        country: Country;
        since: Date;
    }): Promise<Array<{ headline: string; summary: string }>> {
        return this.db.prisma.article.findMany({
            orderBy: {
                createdAt: 'desc',
            },
            select: {
                headline: true,
                summary: true,
            },
            where: {
                AND: [
                    { createdAt: { gte: params.since } },
                    { language: params.language },
                    { country: params.country },
                ],
            },
        });
    }
}
