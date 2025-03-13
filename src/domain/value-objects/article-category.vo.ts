import { z } from 'zod';

export enum CategoryEnum {
    Politics = 'politics',
    Technology = 'technology',
    Science = 'science',
    Health = 'health',
    Entertainment = 'entertainment',
    Sports = 'sports',
    Business = 'business',
    Other = 'other'
}

export const categorySchema = z.nativeEnum(CategoryEnum);

export class ArticleCategory {
    private constructor(public readonly value: CategoryEnum) {}

    public static create(category: string): ArticleCategory {
        const normalizedCategory = category.toLowerCase() as CategoryEnum;
        const result = categorySchema.safeParse(normalizedCategory);

        if (!result.success) {
            throw new Error(
                `Invalid category: ${category}. Supported categories are: ${Object.values(CategoryEnum).join(', ')}`,
            );
        }

        return new ArticleCategory(result.data);
    }

    public equals(other: ArticleCategory): boolean {
        return this.value === other.value;
    }

    public toString(): string {
        return this.value;
    }
} 