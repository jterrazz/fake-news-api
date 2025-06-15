import { TZDate } from '@date-fns/tz';
import { endOfDay, startOfDay } from 'date-fns';

import type {
    ArticleRepositoryPort,
    FindManyOptions,
    FindManyResult,
    FindPublishedSummariesOptions,
    SaveArticlesResult,
} from '../../../application/ports/outbound/persistence/article-repository.port.js';

import type { Article } from '../../../domain/entities/article.entity.js';

import type { PrismaAdapter } from './prisma.adapter.js';
import { ArticleMapper } from './prisma-article.mapper.js';

// Map of country codes to their timezone identifiers
const COUNTRY_TIMEZONES: Record<string, string> = {
    fr: 'Europe/Paris',
    us: 'America/New_York',
};

export class PrismaArticleRepository implements ArticleRepositoryPort {
    private readonly mapper: ArticleMapper;

    constructor(private readonly prisma: PrismaAdapter) {
        this.mapper = new ArticleMapper();
    }

    async countManyForDay(params: FindPublishedSummariesOptions): Promise<number> {
        const countryCode = params.country.toString().toLowerCase();
        const timezone = COUNTRY_TIMEZONES[countryCode];

        if (!timezone) {
            throw new Error(`Unsupported country: ${countryCode}`);
        }

        // Create a timezone-aware date
        const tzDate = params.date
            ? new TZDate(params.date, timezone)
            : new TZDate(new Date(), timezone);

        // Get start and end of day in the target timezone
        const start = startOfDay(tzDate);
        const end = endOfDay(tzDate);

        return this.prisma.getPrismaClient().article.count({
            where: {
                country: this.mapper.mapCountryToPrisma(params.country),
                createdAt: {
                    gte: start,
                    lte: end,
                },
                language: this.mapper.mapLanguageToPrisma(params.language),
            },
        });
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

    async findMany(params: FindManyOptions): Promise<FindManyResult> {
        const baseWhere = {
            ...(params.language && { language: this.mapper.mapLanguageToPrisma(params.language) }),
            ...(params.category && { category: this.mapper.mapCategoryToPrisma(params.category) }),
            ...(params.country && { country: this.mapper.mapCountryToPrisma(params.country) }),
        };

        const itemsWhere = {
            ...baseWhere,
            ...(params.cursor && {
                createdAt: {
                    lt: params.cursor,
                },
            }),
        };

        const [items, total] = await Promise.all([
            this.prisma.getPrismaClient().article.findMany({
                orderBy: {
                    createdAt: 'desc',
                },
                take: params.limit + 1,
                where: itemsWhere,
            }),
            this.prisma.getPrismaClient().article.count({ where: baseWhere }),
        ]);

        return {
            items: items.map((item) => this.mapper.toDomain(item)),
            total,
        };
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
