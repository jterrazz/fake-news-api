import { z } from 'zod/v4';

export const holisticDigestSchema = z
    .string()
    .min(50, 'Holistic digest must be at least 50 characters long')
    .max(10000, 'Holistic digest cannot exceed 10000 characters')
    .describe(
        'A comprehensive and detailed summary of a single perspective on the story. This digest should act as a raw information dump for a writer, containing all key arguments, evidence, quotes, and contextual details necessary to construct a full article from this viewpoint. The focus is on completeness and accuracy, not on narrative polish.',
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
