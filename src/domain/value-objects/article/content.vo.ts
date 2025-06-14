import { z } from 'zod/v4';

export const contentSchema = z
    .string()
    .min(30, 'Article content must be at least 30 characters long');

export class Content {
    private readonly value: string;

    constructor(content: string) {
        const result = contentSchema.safeParse(content);

        if (!result.success) {
            throw new Error(`Invalid content: ${result.error.message}`);
        }

        this.value = result.data;
    }

    public toString(): string {
        return this.value;
    }
}
