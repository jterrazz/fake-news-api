import { z } from 'zod/v4';

export const holisticDigestSchema = z
    .string()
    .min(200, 'Holistic digest must be at least 200 characters long')
    .max(20000, 'Holistic digest cannot exceed 20000 characters')
    .describe(
        'A comprehensive and detailed summary of a single perspective on the story. This digest should act as a raw information dump for a writer, containing all key arguments, evidence, quotes, and contextual details necessary to construct a full article from this viewpoint. The focus is on completeness and accuracy and clarity for reconstructing the information, not on narrative polish.' +
            'It MUST contain ALL the information needed to understand this perspective, including the main points, key details, and any relevant context. It does not need to be written, just a list of all the information. In the most efficient way possible.' +
            'CRITICAL: DO NOT FORGET ANYTHING. WRITE EVERYTHING.',
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
