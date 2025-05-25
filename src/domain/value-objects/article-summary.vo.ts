import { z } from 'zod/v4';

export const summarySchema = z
    .string()
    .min(30, 'Article summary must be at least 30 characters long');

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
