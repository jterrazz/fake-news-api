import { z } from 'zod/v4';

export const headlineSchema = z
    .string()
    .min(1, 'Article headline must be at least 1 characters long');

export class Headline {
    public readonly value: string;

    constructor(headline: string) {
        const result = headlineSchema.safeParse(headline);

        if (!result.success) {
            throw new Error(`Invalid headline: ${result.error.message}`);
        }

        this.value = result.data;
    }

    public toString(): string {
        return this.value;
    }
}
