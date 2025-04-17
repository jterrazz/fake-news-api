import { Article as PrismaArticle, Category, Country, Language } from '@prisma/client';

import {
    type GetArticlesParams,
    type GetArticlesUseCase,
} from '../../../../application/use-cases/articles/get-articles.use-case.js';

type PaginatedResponse<T> = {
    items: T[];
    nextCursor: null | string;
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
