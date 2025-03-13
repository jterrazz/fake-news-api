import { Article as PrismaArticle, Category, Country, Language } from '@prisma/client';
import { z } from 'zod';

import { type ArticleRepository } from '../../../../application/ports/outbound/persistence/article-repository.port.js';

import {
    ArticleCategory,
    CategoryEnum,
} from '../../../../domain/value-objects/article-category.vo.js';
import {
    ArticleCountry,
    CountryEnum,
} from '../../../../domain/value-objects/article-country.vo.js';
import {
    ArticleLanguage,
    LanguageEnum,
} from '../../../../domain/value-objects/article-language.vo.js';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

const paginationSchema = z.object({
    category: z
        .enum([
            CategoryEnum.Politics,
            CategoryEnum.Technology,
            CategoryEnum.Science,
            CategoryEnum.Health,
            CategoryEnum.Entertainment,
            CategoryEnum.Sports,
            CategoryEnum.Business,
            CategoryEnum.Other,
        ])
        .optional(),
    country: z.nativeEnum(CountryEnum).optional(),
    cursor: z.string().optional(),
    language: z.nativeEnum(LanguageEnum).default(LanguageEnum.English),
    limit: z.coerce.number().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

type PaginatedResponse<T> = {
    items: T[];
    nextCursor: string | null;
    total: number;
};

export class ArticleController {
    constructor(private readonly articleRepository: ArticleRepository) {}

    async getArticles(params: {
        category?: string;
        country?: string;
        cursor?: string;
        language: string;
        limit: number;
    }): Promise<PaginatedResponse<PrismaArticle>> {
        const validatedParams = paginationSchema.safeParse({
            category: params.category,
            country: params.country,
            cursor: params.cursor,
            language: params.language,
            limit: params.limit,
        });

        if (!validatedParams.success) {
            throw new Error('Invalid pagination parameters');
        }

        const { cursor, limit, category, language, country } = validatedParams.data;

        // Decode cursor if provided
        let cursorDate: Date | undefined;
        if (cursor) {
            try {
                const timestamp = Number(atob(cursor));
                if (isNaN(timestamp)) throw new Error('Invalid cursor timestamp');
                cursorDate = new Date(timestamp);
            } catch {
                throw new Error('Invalid cursor');
            }
        }

        const { items, total } = await this.articleRepository.findMany({
            category: category ? ArticleCategory.create(category) : undefined,
            country: country ? ArticleCountry.create(country) : undefined,
            cursor: cursorDate,
            language: ArticleLanguage.create(language),
            limit,
        });

        // Check if there are more items
        const hasMore = items.length > limit;
        const results = items.slice(0, limit);

        // Generate next cursor
        const nextCursor = hasMore
            ? Buffer.from(results[results.length - 1].createdAt.getTime().toString()).toString(
                  'base64',
              )
            : null;

        // Convert domain articles to Prisma articles
        const prismaArticles: PrismaArticle[] = results.map((article) => ({
            article: article.content.toString(),
            category: article.category.toString() as Category,
            country: article.country.toString() as Country,
            createdAt: article.createdAt,
            fakeReason: article.fakeStatus.reason,
            headline: article.headline.toString(),
            id: article.id,
            isFake: article.isFake(),
            language: article.language.toString() as Language,
            summary: article.summary.toString(),
        }));

        return {
            items: prismaArticles,
            nextCursor,
            total,
        };
    }
}
