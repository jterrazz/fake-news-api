import { z } from 'zod/v4';

export const summarySchema = z
    .string()
    .min(30, 'Article summary must be at least 30 characters long');

export class Summary {
    public readonly value: string;

    constructor(summary: string) {
        const result = summarySchema.safeParse(summary);

        if (!result.success) {
            throw new Error(`Invalid summary: ${result.error.message}`);
        }

        this.value = result.data;
    }

    public toString(): string {
        return this.value;
    }
}
