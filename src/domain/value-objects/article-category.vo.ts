import { z } from 'zod/v4';

export enum CategoryEnum {
    Business = 'business',
    Entertainment = 'entertainment',
    Health = 'health',
    Other = 'other',
    Politics = 'politics',
    Science = 'science',
    Sports = 'sports',
    Technology = 'technology',
    World = 'world',
}

export const categorySchema = z.nativeEnum(CategoryEnum);

export class ArticleCategory {
    private constructor(public readonly value: CategoryEnum) {}

    public static create(category: string): ArticleCategory {
        const normalizedCategory = category.toLowerCase() as CategoryEnum;
        const result = categorySchema.safeParse(normalizedCategory);

        if (!result.success) {
            return new ArticleCategory(CategoryEnum.Other);
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
