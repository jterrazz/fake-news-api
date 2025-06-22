import { z } from 'zod/v4';

export const holisticDigestSchema = z
    .string()
    .min(50, 'Holistic digest must be at least 50 characters long')
    .max(10000, 'Holistic digest cannot exceed 10000 characters')
    .describe(
        'All the information needed to understand this perspective, including the main points, key details, and any relevant context. It does not need to be written, just a list of all the information. In the most efficient way possible.',
    );

export class HolisticDigest {
    public readonly value: string;

    constructor(digest: string) {
        const result = holisticDigestSchema.safeParse(digest);

        if (!result.success) {
            throw new Error(`Invalid holistic digest: ${result.error.message}`);
        }

        this.value = result.data;
    }

    public toString(): string {
        return this.value;
    }
}
