import { type Category, type Country, type Language } from '@prisma/client';

import { type PaginatedResponse as UseCasePaginatedResponse } from '../../../../application/use-cases/articles/get-articles.use-case.js';

import { type Article } from '../../../../domain/entities/article.entity.js';

type ArticleMetadata = {
    category: Category;
    country: Country;
    language: Language;
};

type ArticleResponse = ArticleResponseDeprecated & ArticleResponseNew;

/**
 * Deprecated article response properties - maintained for backward compatibility
 */
type ArticleResponseDeprecated = {
    article: string;
    category: Category;
    contentRaw: string;
    contentWithAnnotations: string;
    country: Country;
    createdAt: Date;
    fakeReason: null | string;
    headline: string;
    isFake: boolean;
    language: Language;
    summary: string;
};

type ArticleResponseNew = {
    id: string;
    metadata: ArticleMetadata;
    publishedAt: string;
    variants: ArticleVariants;
};

type ArticleVariant = {
    body: string;
    headline: string;
};

type ArticleVariants = {
    fake: FakeArticleVariant[];
    original: ArticleVariant[];
};

type FakeArticleVariant = ArticleVariant & {
    reason: string;
};

type HttpPaginatedResponse<T> = {
    items: T[];
    nextCursor: null | string;
    total: number;
};

/**
 * Handles response formatting for GET /articles endpoint
 * Transforms domain objects to HTTP response format with variants structure
 */
export class GetArticlesResponsePresenter {
    present(result: UseCasePaginatedResponse<Article>): HttpPaginatedResponse<ArticleResponse> {
        const articles: ArticleResponse[] = result.items.map((article) =>
            this.mapArticleToResponse(article),
        );

        const nextCursor = result.lastItemDate
            ? Buffer.from(result.lastItemDate.getTime().toString()).toString('base64')
            : null;

        return {
            items: articles,
            nextCursor,
            total: result.total,
        };
    }

    private mapArticleToResponse(article: Article): ArticleResponse {
        const content = article.body.toString();
        const { contentRaw, contentWithAnnotations } = this.processContent(content);

        const newResponse: ArticleResponseNew = {
            id: article.id,
            metadata: {
                category: article.category.toString() as Category,
                country: article.country.toString() as Country,
                language: article.language.toString() as Language,
            },
            publishedAt: article.publishedAt.toISOString(),
            variants: article.isFake()
                ? {
                      fake: [
                          {
                              body: contentWithAnnotations,
                              headline: article.headline.toString(),
                              reason: article.authenticity.reason!,
                          },
                      ],
                      original: [],
                  }
                : {
                      fake: [],
                      original: [
                          {
                              body: contentRaw,
                              headline: article.headline.toString(),
                          },
                      ],
                  },
        };

        const deprecatedResponse: ArticleResponseDeprecated = {
            article: contentRaw,
            category: article.category.toString() as Category,
            contentRaw,
            contentWithAnnotations,
            country: article.country.toString() as Country,
            createdAt: article.publishedAt,
            fakeReason: article.authenticity.reason,
            headline: article.headline.toString(),
            isFake: article.isFake(),
            language: article.language.toString() as Language,
            summary: article.summary.toString(),
        };

        return {
            ...newResponse,
            ...deprecatedResponse,
        };
    }

    private processContent(content: string): {
        contentRaw: string;
        contentWithAnnotations: string;
    } {
        // Pattern: %%[(word)]( description)%% -> extract "word description" for contentRaw
        // The first group captures everything inside [], the second captures everything inside ()
        let contentRaw = content.replace(/%%\[\((.*?)\)\]\(\s*([^)]*)\)%%/g, '$1 $2');
        let contentWithAnnotations = content;

        // Clean up any remaining %% artifacts
        contentRaw = contentRaw.replace(/%%/g, '');
        contentWithAnnotations = contentWithAnnotations.replace(/\)%%/g, ')');

        return {
            contentRaw,
            contentWithAnnotations,
        };
    }
}
