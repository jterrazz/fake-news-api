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

export class Category {
    private constructor(public readonly value: CategoryEnum) {}

    public static create(category: string): Category {
        const normalizedCategory = category.toLowerCase();
        const result = categorySchema.safeParse(normalizedCategory);

        if (!result.success) {
            return new Category('other');
        }

        return new Category(result.data);
    }

    public toString(): string {
        return this.value;
    }
}
