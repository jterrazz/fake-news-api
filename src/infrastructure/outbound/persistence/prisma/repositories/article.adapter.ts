import type { ArticleRepository } from '../../../../../application/ports/outbound/persistence/article-repository.port.js';

import type { Article } from '../../../../../domain/entities/article.js';
import type { ArticleCategory } from '../../../../../domain/value-objects/article-category.vo.js';
import type { ArticleCountry } from '../../../../../domain/value-objects/article-country.vo.js';
import type { ArticleLanguage } from '../../../../../domain/value-objects/article-language.vo.js';

import { ArticleMapper } from '../mappers/article.mapper.js';
import type { PrismaAdapter } from '../prisma.adapter.js';

export class PrismaArticleRepository implements ArticleRepository {
    private readonly mapper: ArticleMapper;

    constructor(private readonly prisma: PrismaAdapter) {
        this.mapper = new ArticleMapper();
    }

    async findLatest(): Promise<Article | null> {
        const article = await this.prisma.getPrismaClient().article.findFirst({
            orderBy: {
                createdAt: 'desc',
            },
        });

        return article ? this.mapper.toDomain(article) : null;
    }

    async findMany(params: {
        language: ArticleLanguage;
        category?: ArticleCategory;
        country?: ArticleCountry;
        cursor?: Date;
        limit: number;
    }): Promise<{
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

    async findPublishedSummaries(params: {
        language: ArticleLanguage;
        country: ArticleCountry;
        since: Date;
    }): Promise<Array<string>> {
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

    async createMany(articles: Omit<Article, 'id' | 'createdAt'>[]): Promise<Article[]> {
        const data = articles.map((article) => this.mapper.toPrisma(article));
        await this.prisma.getPrismaClient().article.createMany({
            data,
        });

        // Fetch the created articles to return them with their IDs
        const result = await this.prisma.getPrismaClient().article.findMany({
            orderBy: {
                createdAt: 'desc',
            },
            take: articles.length,
            where: {
                createdAt: {
                    gte: new Date(Date.now() - 1000), // Articles created in the last second
                },
            },
        });

        return result.map((article) => this.mapper.toDomain(article));
    }

    async findById(id: string): Promise<Article | null> {
        const article = await this.prisma.getPrismaClient().article.findUnique({
            where: { id },
        });

        return article ? this.mapper.toDomain(article) : null;
    }

    async update(article: Article): Promise<void> {
        const data = this.mapper.toPrisma(article);
        await this.prisma.getPrismaClient().article.update({
            data,
            where: { id: article.id },
        });
    }
}
