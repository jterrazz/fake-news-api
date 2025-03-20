import { z } from 'zod';

export const headlineSchema = z
    .string()
    .min(30, 'Article headline must be at least 30 characters long')
    .max(80, 'Article headline must be at most 80 characters long');

export class ArticleHeadline {
    private constructor(public readonly value: string) {}

    public static create(headline: string): ArticleHeadline {
        const result = headlineSchema.safeParse(headline);

        if (!result.success) {
            throw new Error(`Invalid headline: ${result.error.message}`);
        }

        return new ArticleHeadline(result.data);
    }

    public equals(other: ArticleHeadline): boolean {
        return this.value === other.value;
    }

    public toString(): string {
        return this.value;
    }
}
