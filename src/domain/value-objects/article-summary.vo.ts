import { z } from 'zod';

export const summarySchema = z
    .string()
    .min(100, 'Article summary must be at least 100 characters long');

export class ArticleSummary {
    private constructor(public readonly value: string) {}

    public static create(summary: string): ArticleSummary {
        const result = summarySchema.safeParse(summary);

        if (!result.success) {
            throw new Error(`Invalid summary: ${result.error.message}`);
        }

        return new ArticleSummary(result.data);
    }

    public equals(other: ArticleSummary): boolean {
        return this.value === other.value;
    }

    public toString(): string {
        return this.value;
    }
}
