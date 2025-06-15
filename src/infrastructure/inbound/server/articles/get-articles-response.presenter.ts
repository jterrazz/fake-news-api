import {
    type Article as PrismaArticle,
    type Category,
    type Country,
    type Language,
} from '@prisma/client';

import { type PaginatedResponse as UseCasePaginatedResponse } from '../../../../application/use-cases/articles/get-articles.use-case.js';

import { type Article } from '../../../../domain/entities/article.entity.js';

// Extend PrismaArticle to include our new field while keeping type safety
type ArticleResponse = Omit<PrismaArticle, 'article'> & {
    /** @deprecated Use contentWithAnnotations instead for rich content or contentRaw for plain text */
    article: string;
    /** Raw content without metadata annotations */
    contentRaw: string;
    /** Content with fake news annotations and metadata */
    contentWithAnnotations: string;
};

type HttpPaginatedResponse<T> = {
    items: T[];
    nextCursor: null | string;
    total: number;
};

/**
 * Handles response formatting for GET /articles endpoint
 * Transforms domain objects to HTTP response format
 */
export class GetArticlesResponsePresenter {
    /**
     * Transforms use case result to HTTP response format
     *
     * @param result - Domain result from use case
     * @returns Formatted HTTP response
     */
    present(result: UseCasePaginatedResponse<Article>): HttpPaginatedResponse<ArticleResponse> {
        // Convert domain articles to response format
        const articles: ArticleResponse[] = result.items.map((article) => {
            const content = article.content.toString();

            // Remove metadata annotations for raw content
            let contentRaw = content.replace(/%%\[(.*?)\]\(.*?\)/g, '$1');
            let contentWithAnnotations = content;

            // Remove any '%%' immediately following a metadata annotation throughout the string
            contentRaw = contentRaw.replace(/\)%%/g, ')');
            contentWithAnnotations = contentWithAnnotations.replace(/\)%%/g, ')');

            return {
                article: contentRaw, // Deprecated: Keep for backward compatibility
                category: article.category.toString() as Category,
                contentRaw,
                contentWithAnnotations,
                country: article.country.toString() as Country,
                createdAt: article.createdAt,
                fakeReason: article.authenticity.reason,
                headline: article.headline.toString(),
                id: article.id,
                isFake: article.isFake(),
                language: article.language.toString() as Language,
                summary: article.summary.toString(),
            };
        });

        // Handle cursor encoding (presentation concern)
        const nextCursor = result.lastItemDate
            ? Buffer.from(result.lastItemDate.getTime().toString()).toString('base64')
            : null;

        return {
            items: articles,
            nextCursor,
            total: result.total,
        };
    }
}
