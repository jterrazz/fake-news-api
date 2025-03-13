import { Article as PrismaArticle, Category, Country, Language } from '@prisma/client';
import { z } from 'zod';

import {
    type GetArticlesParams,
    type GetArticlesUseCase,
} from '../../../../application/use-cases/articles/get-articles.use-case.js';

import { CategoryEnum } from '../../../../domain/value-objects/article-category.vo.js';
import { CountryEnum } from '../../../../domain/value-objects/article-country.vo.js';
import { LanguageEnum } from '../../../../domain/value-objects/article-language.vo.js';

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
    constructor(private readonly getArticlesUseCase: GetArticlesUseCase) {}

    async getArticles(params: GetArticlesParams): Promise<PaginatedResponse<PrismaArticle>> {
        const result = await this.getArticlesUseCase.execute(params);

        // Convert domain articles to Prisma articles
        const prismaArticles: PrismaArticle[] = result.items.map((article) => ({
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
            nextCursor: result.nextCursor,
            total: result.total,
        };
    }
}
