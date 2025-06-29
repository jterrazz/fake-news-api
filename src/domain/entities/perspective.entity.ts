import { z } from 'zod/v4';

import { HolisticDigest } from '../value-objects/perspective/holistic-digest.vo.js';
import { PerspectiveTags } from '../value-objects/perspective/perspective-tags.vo.js';

export const perspectiveSchema = z.object({
    createdAt: z.date(),
    holisticDigest: z.instanceof(HolisticDigest),
    id: z.uuid(),
    storyId: z.uuid(),
    tags: z.instanceof(PerspectiveTags),
    updatedAt: z.date(),
});

export type PerspectiveProps = z.input<typeof perspectiveSchema>;

/**
 * @description Represents a specific viewpoint or angle on a news story
 */
export class Perspective {
    public readonly createdAt: Date;
    public readonly holisticDigest: HolisticDigest;
    public readonly id: string;
    public readonly storyId: string;
    public readonly tags: PerspectiveTags;
    public readonly updatedAt: Date;

    public constructor(data: PerspectiveProps) {
        const result = perspectiveSchema.safeParse(data);

        if (!result.success) {
            throw new Error(`Invalid perspective data: ${result.error.message}`);
        }

        const validatedData = result.data;
        this.id = validatedData.id;
        this.holisticDigest = validatedData.holisticDigest;
        this.tags = validatedData.tags;
        this.storyId = validatedData.storyId;
        this.createdAt = validatedData.createdAt;
        this.updatedAt = validatedData.updatedAt;
    }
}
