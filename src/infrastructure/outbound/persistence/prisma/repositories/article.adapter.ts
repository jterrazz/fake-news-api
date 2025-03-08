import type { FindArticlesQuery, FindArticlesResult } from '../../../../application/inbound/ports/use-cases/article.use-cases.js';
import type { ArticleRepository } from '../../../../application/outbound/ports/persistence/article.repository.js';

import type { Article } from '../../../../../domain/entities/article.js';

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

    async findMany(query: FindArticlesQuery): Promise<FindArticlesResult> {
        const where = {
            language: this.mapper.mapLanguageToPrisma(query.language),
            ...(query.category && { category: this.mapper.mapCategoryToPrisma(query.category) }),
            ...(query.country && { country: this.mapper.mapCountryToPrisma(query.country) }),
            ...(query.cursor && { createdAt: { lt: query.cursor } }),
        };

        const [items, total] = await Promise.all([
            this.prisma.getPrismaClient().article.findMany({
                orderBy: {
                    createdAt: 'desc',
                },
                take: query.limit,
                where,
            }),
            this.prisma.getPrismaClient().article.count({ where }),
        ]);

        return {
            items: items.map(item => this.mapper.toDomain(item)),
            total,
        };
    }

    async save(article: Article): Promise<void> {
        const data = this.mapper.toPrisma(article);
        await this.prisma.getPrismaClient().article.create({ data });
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