import { z } from 'zod';

import { type Article } from '../../../domain/entities/article.js';
import {
    ArticleCategory,
    CategoryEnum,
} from '../../../domain/value-objects/article-category.vo.js';
import { ArticleCountry, CountryEnum } from '../../../domain/value-objects/article-country.vo.js';
import {
    ArticleLanguage,
    LanguageEnum,
} from '../../../domain/value-objects/article-language.vo.js';

import { type ArticleRepositoryPort } from '../../ports/outbound/persistence/article-repository.port.js';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

export const getArticlesParamsSchema = z.object({
    category: z
        .enum([
            CategoryEnum.Politics,
            CategoryEnum.Technology,
            CategoryEnum.Science,
            CategoryEnum.Health,
            CategoryEnum.Entertainment,
            CategoryEnum.Sports,
            CategoryEnum.Business,
            CategoryEnum.World,
        ])
        .optional(),
    country: z.nativeEnum(CountryEnum).optional(),
    cursor: z.string().optional(),
    language: z.nativeEnum(LanguageEnum).optional(),
    limit: z.coerce.number().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type GetArticlesParams = z.infer<typeof getArticlesParamsSchema>;

export type PaginatedResponse<T> = {
    items: T[];
    nextCursor: string | null;
    total: number;
};

export class GetArticlesUseCase {
    constructor(private readonly articleRepository: ArticleRepositoryPort) {}

    async execute(params: GetArticlesParams): Promise<PaginatedResponse<Article>> {
        const validatedParams = getArticlesParamsSchema.safeParse(params);

        if (!validatedParams.success) {
            throw new Error('Invalid pagination parameters');
        }

        const { cursor, limit, category, language, country } = validatedParams.data;

        // Decode cursor if provided
        let cursorDate: Date | undefined;
        if (cursor) {
            const decodedString = Buffer.from(cursor, 'base64').toString();
            const timestamp = Number(decodedString);

            if (isNaN(timestamp)) throw new Error('Invalid cursor timestamp');

            cursorDate = new Date(timestamp);
        }

        const { items, total } = await this.articleRepository.findMany({
            category: category ? ArticleCategory.create(category) : undefined,
            country: country
                ? ArticleCountry.create(country)
                : ArticleCountry.create(CountryEnum.UnitedStates), // Default to US if not specified
            cursor: cursorDate,
            language: language ? ArticleLanguage.create(language) : undefined,
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
