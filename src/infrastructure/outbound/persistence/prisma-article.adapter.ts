import type {
    ArticleRepositoryPort,
    CountManyOptions,
    FindManyOptions,
    FindPublishedSummariesOptions,
    SaveArticlesResult,
} from '../../../application/ports/outbound/persistence/article-repository.port.js';

import type { Article } from '../../../domain/entities/article.entity.js';

import type { PrismaAdapter } from './prisma.adapter.js';
import { ArticleMapper } from './prisma-article.mapper.js';

export class PrismaArticleRepository implements ArticleRepositoryPort {
    private readonly mapper: ArticleMapper;

    constructor(private readonly prisma: PrismaAdapter) {
        this.mapper = new ArticleMapper();
    }

    async countMany(params: CountManyOptions): Promise<number> {
        const where = {
            ...(params.language && { language: this.mapper.mapLanguageToPrisma(params.language) }),
            ...(params.category && { category: this.mapper.mapCategoryToPrisma(params.category) }),
            ...(params.country && { country: this.mapper.mapCountryToPrisma(params.country) }),
            ...(params.startDate &&
                params.endDate && {
                    createdAt: {
                        gte: params.startDate,
                        lte: params.endDate,
                    },
                }),
        };

        return this.prisma.getPrismaClient().article.count({ where });
    }

    async createMany(articles: Article[]): Promise<SaveArticlesResult> {
        const prismaArticles = articles.map((article) => this.mapper.toPrisma(article));

        await this.prisma.getPrismaClient().$transaction(
            prismaArticles.map((article) =>
                this.prisma.getPrismaClient().article.create({
                    data: article,
                }),
            ),
        );

        return {
            articlesCount: articles.length,
        };
    }

    async findMany(params: FindManyOptions): Promise<Article[]> {
        const where = {
            ...(params.language && { language: this.mapper.mapLanguageToPrisma(params.language) }),
            ...(params.category && { category: this.mapper.mapCategoryToPrisma(params.category) }),
            ...(params.country && { country: this.mapper.mapCountryToPrisma(params.country) }),
            ...(params.cursor && {
                createdAt: {
                    lt: params.cursor,
                },
            }),
        };

        const items = await this.prisma.getPrismaClient().article.findMany({
            orderBy: {
                createdAt: 'desc',
            },
            take: params.limit + 1,
            where,
        });

        return items.map((item) => this.mapper.toDomain(item));
    }

    async findPublishedSummaries(
        params: FindPublishedSummariesOptions,
    ): Promise<Array<{ headline: string; summary: string }>> {
        const articles = await this.prisma.getPrismaClient().article.findMany({
            orderBy: {
                createdAt: 'desc',
            },
            select: {
                headline: true,
                summary: true,
            },
            where: {
                country: this.mapper.mapCountryToPrisma(params.country),
                ...(params.since && {
                    createdAt: {
                        gte: params.since,
                    },
                }),
                language: this.mapper.mapLanguageToPrisma(params.language),
            },
        });

        return articles.map((article) => ({
            headline: article.headline,
            summary: article.summary,
        }));
    }
}
