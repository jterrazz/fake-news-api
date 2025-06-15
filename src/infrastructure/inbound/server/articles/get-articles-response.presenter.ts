import { type Category, type Country, type Language } from '@prisma/client';

import { type PaginatedResponse as UseCasePaginatedResponse } from '../../../../application/use-cases/articles/get-articles.use-case.js';

import { type Article } from '../../../../domain/entities/article.entity.js';

/**
 * Complete article response including deprecated fields
 */
type ArticleResponse = ArticleResponseDeprecated & ArticleResponseMain;

/**
 * Deprecated article response properties
 */
type ArticleResponseDeprecated = {
    /** @deprecated Use contentRaw for plain text or contentWithAnnotations for rich content */
    article: string;
};

/**
 * Main article response properties
 */
type ArticleResponseMain = {
    /** Article category */
    category: Category;
    /** Raw content without metadata annotations */
    contentRaw: string;
    /** Content with fake news annotations and metadata */
    contentWithAnnotations: string;
    /** Article country */
    country: Country;
    /** Creation timestamp */
    createdAt: Date;
    /** Reason why the article is fake (if applicable) */
    fakeReason: null | string;
    /** Article headline */
    headline: string;
    /** Unique identifier */
    id: string;
    /** Whether the article is fake */
    isFake: boolean;
    /** Article language */
    language: Language;
    /** Article summary */
    summary: string;
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
        const articles: ArticleResponse[] = result.items.map((article) =>
            this.mapArticleToResponse(article),
        );

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

    /**
     * Maps a domain article to the HTTP response format
     */
    private mapArticleToResponse(article: Article): ArticleResponse {
        const content = article.body.toString();
        const { contentRaw, contentWithAnnotations } = this.processContent(content);

        // Main properties
        const mainResponse: ArticleResponseMain = {
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

        // Deprecated properties
        const deprecatedResponse: ArticleResponseDeprecated = {
            article: contentRaw, // Backward compatibility
        };

        return {
            ...mainResponse,
            ...deprecatedResponse,
        };
    }

    /**
     * Processes content to create raw and annotated versions
     */
    private processContent(content: string): {
        contentRaw: string;
        contentWithAnnotations: string;
    } {
        // Remove metadata annotations for raw content
        let contentRaw = content.replace(/%%\[(.*?)\]\(.*?\)/g, '$1');
        let contentWithAnnotations = content;

        // Remove any '%%' immediately following a metadata annotation throughout the string
        contentRaw = contentRaw.replace(/\)%%/g, ')');
        contentWithAnnotations = contentWithAnnotations.replace(/\)%%/g, ')');

        return {
            contentRaw,
            contentWithAnnotations,
        };
    }
}
