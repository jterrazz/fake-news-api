import { type Article } from '../../../domain/entities/article.entity.js';
import { type Category } from '../../../domain/value-objects/category.vo.js';
import { Country } from '../../../domain/value-objects/country.vo.js';
import { type Language } from '../../../domain/value-objects/language.vo.js';

import { type ArticleRepositoryPort } from '../../ports/outbound/persistence/article-repository.port.js';

/**
 * Input parameters for the GetArticles use case using domain value objects
 */
export interface GetArticlesParams {
    category?: Category;
    country?: Country;
    cursor?: Date;
    language?: Language;
    limit: number;
}

export type PaginatedResponse<T> = {
    items: T[];
    nextCursor: null | string;
    total: number;
};

export class GetArticlesUseCase {
    constructor(private readonly articleRepository: ArticleRepositoryPort) {}

    async execute(params: GetArticlesParams): Promise<PaginatedResponse<Article>> {
        const { category, country, cursor, language, limit } = params;

        const { items, total } = await this.articleRepository.findMany({
            category,
            country: country || new Country('us'), // Default to US if not specified
            cursor,
            language,
            limit,
        });

        // Check if there are more items
        const hasMore = items.length > limit;
        const results = hasMore ? items.slice(0, limit) : items;

        // Generate next cursor from the last item if there are more results
        let nextCursor = null;
        if (hasMore && results.length > 0) {
            const lastItem = results[results.length - 1];
            const timestamp = lastItem.createdAt.getTime().toString();
            nextCursor = Buffer.from(timestamp).toString('base64');
        }

        return {
            items: results,
            nextCursor,
            total,
        };
    }
}
