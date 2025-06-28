import type {
    ArticleRepositoryPort,
    CountManyOptions,
    FindHeadlinesAndSummariesOptions,
    FindManyOptions,
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

    async createMany(articles: Article[]): Promise<void> {
        await this.prisma.getPrismaClient().$transaction(
            articles.map((article) =>
                this.prisma.getPrismaClient().article.create({
                    data: this.mapper.toPrisma(article),
                }),
            ),
        );
    }

    async findHeadlinesAndSummaries(
        params: FindHeadlinesAndSummariesOptions,
    ): Promise<Array<{ headline: string; summary: string }>> {
        const where = {
            country: this.mapper.mapCountryToPrisma(params.country),
            language: this.mapper.mapLanguageToPrisma(params.language),
            ...(params.since && {
                createdAt: {
                    gte: params.since,
                },
            }),
        };

        const articles = await this.prisma.getPrismaClient().article.findMany({
            orderBy: {
                createdAt: 'desc',
            },
            select: {
                body: true,
                headline: true,
            },
            where,
        });

        return articles.map((article) => ({
            headline: article.headline,
            summary: article.body.substring(0, 200) + '...', // Generate summary from body // TODO FIx this
        }));
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
            include: {
                stories: {
                    select: { id: true },
                },
                variants: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: params.limit + 1,
            where,
        });

        return items.map((item) => this.mapper.toDomain(item));
    }
}
