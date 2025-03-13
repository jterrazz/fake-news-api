import type {
    ArticleRepositoryPort,
    FindManyParams,
    FindPublishedSummariesParams,
} from '../../../../../application/ports/outbound/persistence/article-repository.port.js';

import type { Article } from '../../../../../domain/entities/article.js';

import { ArticleMapper } from '../mappers/article.mapper.js';
import type { PrismaAdapter } from '../prisma.adapter.js';

export class PrismaArticleRepository implements ArticleRepositoryPort {
    private readonly mapper: ArticleMapper;

    constructor(private readonly prisma: PrismaAdapter) {
        this.mapper = new ArticleMapper();
    }

    async findMany(params: FindManyParams): Promise<{
        items: Article[];
        total: number;
    }> {
        const where = {
            language: this.mapper.mapLanguageToPrisma(params.language),
            ...(params.category && { category: this.mapper.mapCategoryToPrisma(params.category) }),
            ...(params.country && { country: this.mapper.mapCountryToPrisma(params.country) }),
            ...(params.cursor && { createdAt: { lt: params.cursor } }),
        };

        const [items, total] = await Promise.all([
            this.prisma.getPrismaClient().article.findMany({
                orderBy: {
                    createdAt: 'desc',
                },
                take: params.limit,
                where,
            }),
            this.prisma.getPrismaClient().article.count({ where }),
        ]);

        return {
            items: items.map((item) => this.mapper.toDomain(item)),
            total,
        };
    }

    async findPublishedSummaries(params: FindPublishedSummariesParams): Promise<Array<string>> {
        const articles = await this.prisma.getPrismaClient().article.findMany({
            select: {
                summary: true,
            },
            where: {
                country: this.mapper.mapCountryToPrisma(params.country),
                createdAt: {
                    gte: params.since,
                },
                language: this.mapper.mapLanguageToPrisma(params.language),
            },
        });

        return articles.map((article) => article.summary);
    }

    async createMany(articles: Article[]): Promise<Article[]> {
        const prismaArticles = articles.map((article) => this.mapper.toPrisma(article));

        const createdArticles = await this.prisma.getPrismaClient().$transaction(
            prismaArticles.map((article) =>
                this.prisma.getPrismaClient().article.create({
                    data: article,
                }),
            ),
        );

        return createdArticles.map((article) => this.mapper.toDomain(article));
    }
}
