import { z } from 'zod/v4';

export const categorySchema = z
    .enum([
        'politics',
        'business',
        'technology',
        'science',
        'health',
        'environment',
        'society',
        'entertainment',
        'sports',
        'other',
    ])
    .describe(
        "Classifies the news story into a predefined category. If the story doesn't fit any of the specific categories, 'other' must be used as a fallback.",
    );

export type CategoryEnum = z.infer<typeof categorySchema>;

export class Category {
    public readonly value: CategoryEnum;

    constructor(category: string) {
        const normalizedCategory = category.toLowerCase();
        const result = categorySchema.safeParse(normalizedCategory);

        if (!result.success) {
            this.value = 'other';
        } else {
            this.value = result.data;
        }
    }

    public toString(): CategoryEnum {
        return this.value;
    }
}
