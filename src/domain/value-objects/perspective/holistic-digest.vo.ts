import { z } from 'zod/v4';

export const holisticDigestSchema = z
    .string()
    .min(50, 'Holistic digest must be at least 50 characters long')
    .max(10000, 'Holistic digest cannot exceed 10000 characters');

export class HolisticDigest {
    public readonly value: string;

    constructor(digest: string) {
        const result = holisticDigestSchema.safeParse(digest);

        if (!result.success) {
            throw new Error(`Invalid holistic digest: ${result.error.message}`);
        }

        this.value = result.data;
    }

    public getCharacterCount(): number {
        return this.value.length;
    }

    public getWordCount(): number {
        return this.value.split(/\s+/).length;
    }

    public toString(): string {
        return this.value;
    }
} 