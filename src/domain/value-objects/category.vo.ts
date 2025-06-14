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
    private readonly value: CategoryEnum;

    constructor(category: string) {
        const normalizedCategory = category.toLowerCase();
        const result = categorySchema.safeParse(normalizedCategory);

        if (!result.success) {
            this.value = 'other';
        } else {
            this.value = result.data;
        }
    }

    public toString(): string {
        return this.value;
    }
}
