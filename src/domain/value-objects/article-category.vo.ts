import { z } from 'zod/v4';

export const categorySchema = z.enum([
    'business',
    'entertainment',
    'health',
    'other',
    'politics',
    'science',
    'sports',
    'technology',
    'world',
]);

export type CategoryEnum = z.infer<typeof categorySchema>;

export class ArticleCategory {
    private constructor(public readonly value: CategoryEnum) {}

    public static create(category: string): ArticleCategory {
        const normalizedCategory = category.toLowerCase();
        const result = categorySchema.safeParse(normalizedCategory);

        if (!result.success) {
            return new ArticleCategory('other');
        }

        return new ArticleCategory(result.data);
    }

    public toString(): string {
        return this.value;
    }
}
