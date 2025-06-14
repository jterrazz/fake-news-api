import { z } from 'zod/v4';

export const headlineSchema = z
    .string()
    .min(1, 'Article headline must be at least 1 characters long');

export class ArticleHeadline {
    private constructor(public readonly value: string) {}

    public static create(headline: string): ArticleHeadline {
        const result = headlineSchema.safeParse(headline);

        if (!result.success) {
            throw new Error(`Invalid headline: ${result.error.message}`);
        }

        return new ArticleHeadline(result.data);
    }

    public toString(): string {
        return this.value;
    }
}
