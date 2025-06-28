import { type Category, type Country, type Language } from '@prisma/client';

import { type PaginatedResponse as UseCasePaginatedResponse } from '../../../../application/use-cases/articles/get-articles.use-case.js';

import { type Article } from '../../../../domain/entities/article.entity.js';

type ArticleMetadata = {
    category: Category;
    country: Country;
    language: Language;
};

type ArticleResponse = {
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

        return {
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
