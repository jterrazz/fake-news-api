import type { Article, Category, Country, Language, Prisma } from '@prisma/client';

import type { ArticleRepository } from '../../domain/repositories/article.repository.js';

import { prisma } from '../../db/client.js';

export class PrismaArticleRepository implements ArticleRepository {
    async findLatest(): Promise<Article | null> {
        return prisma.article.findFirst({
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async createMany(articles: Omit<Article, 'id' | 'createdAt'>[]): Promise<Article[]> {
        await prisma.article.createMany({
            data: articles,
        });

        // Fetch the created articles to return them
        return prisma.article.findMany({
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
        const total = await prisma.article.count({ where });

        // Fetch items
        const items = await prisma.article.findMany({
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
        return prisma.article.findMany({
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
