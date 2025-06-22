import { z } from 'zod/v4';

export const StanceSchema = z.enum([
    'supportive', // Supports what's happening in the story
    'critical', // Critical of what's happening
    'neutral', // Balanced/no clear position
    'mixed', // Both positive and negative aspects
    'concerned', // Worried about implications
    'optimistic', // Hopeful about outcomes
    'skeptical', // Doubtful/questioning
]);

export const DiscourseTypeSchema = z.enum([
    'mainstream', // Widely accepted views, traditional media
    'alternative', // Outside mainstream but within reasonable debate
    'underreported', // Perspectives not adequately covered by media
    'dubious', // Questionable claims, of doubtful validity
]);

export const perspectiveTagsSchema = z
    .object({
        discourse_type: DiscourseTypeSchema.optional(),
        stance: StanceSchema.optional(),
    })
    .refine((tags) => Object.values(tags).some((value) => value !== undefined), {
        message: 'At least one tag must be provided',
    });

export type DiscourseType = z.infer<typeof DiscourseTypeSchema>;
export type PerspectiveTagsData = z.infer<typeof perspectiveTagsSchema>;
export type Stance = z.infer<typeof StanceSchema>;

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
