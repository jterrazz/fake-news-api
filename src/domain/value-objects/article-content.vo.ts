import { z } from 'zod';

const contentSchema = z.string().min(50, 'Article content must be at least 50 characters long');

export class ArticleContent {
    private constructor(public readonly value: string) {}

    public static create(content: string): ArticleContent {
        const result = contentSchema.safeParse(content);

        if (!result.success) {
            throw new Error(`Invalid content: ${result.error.message}`);
        }

        return new ArticleContent(result.data);
    }

    public equals(other: ArticleContent): boolean {
        return this.value === other.value;
    }

    public toString(): string {
        return this.value;
    }
} 