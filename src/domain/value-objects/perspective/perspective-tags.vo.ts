import { z } from 'zod/v4';

export const StanceSchema = z.enum([
    'supportive',
    'critical',
    'neutral',
    'mixed',
    'concerned',
    'optimistic',
    'skeptical',
]).describe(`The perspective's stance toward the specific story:
- supportive: supports what's happening
- critical: critical of what's happening  
- neutral: balanced/no clear position
- mixed: both positive and negative aspects
- concerned: worried about implications
- optimistic: hopeful about outcomes
- skeptical: doubtful/questioning`);

// Discourse level - where this perspective sits in public discourse
export const DiscourseTypeSchema = z.enum(['mainstream', 'alternative', 'underreported', 'dubious'])
    .describe(`Where this perspective sits in public discourse:
- mainstream: widely accepted views, traditional media
- alternative: outside mainstream but within reasonable debate
- underreported: perspectives not adequately covered by media
- dubious: questionable claims, of doubtful validity`);

// Complete perspective tags schema
export const perspectiveTagsSchema = z
    .object({
        // Where this perspective sits in public discourse
        discourse_type: DiscourseTypeSchema.optional(),

        // Simple stance toward the specific story
        stance: StanceSchema.optional(),
    })
    .refine((tags) => Object.values(tags).some((value) => value !== undefined), {
        message: 'At least one tag must be provided',
    })
    .describe("Tags that categorize a perspective's stance and position in public discourse");

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
