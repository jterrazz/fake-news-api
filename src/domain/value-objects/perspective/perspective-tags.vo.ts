import { z } from 'zod/v4';

export const perspectiveTagsSchema = z.record(z.string(), z.string()).refine(
    (tags) => Object.keys(tags).length > 0,
    {
        message: 'At least one tag must be provided',
    }
);

export type PerspectiveTagsData = z.infer<typeof perspectiveTagsSchema>;

export class PerspectiveTags {
    public readonly tags: PerspectiveTagsData;

    constructor(tags: PerspectiveTagsData) {
        const result = perspectiveTagsSchema.safeParse(tags);

        if (!result.success) {
            throw new Error(`Invalid perspective tags: ${result.error.message}`);
        }

        this.tags = result.data;
    }

    public toString(): string {
        return JSON.stringify(this.tags);
    }
} 