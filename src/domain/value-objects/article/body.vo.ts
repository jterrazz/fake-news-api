import { z } from 'zod/v4';

export const bodySchema = z.string().min(30, 'Article body must be at least 30 characters long');

export class Body {
    public readonly value: string;

    constructor(body: string) {
        const result = bodySchema.safeParse(body);

        if (!result.success) {
            throw new Error(`Invalid body: ${result.error.message}`);
        }

        this.value = result.data;
    }

    public toString(): string {
        return this.value;
    }
}
