import { z } from 'zod/v4';

/**
 * Zod schema for the InterestTier. It validates that the tier
 * is one of the allowed string literals.
 */
export const interestTierSchema = z.enum(['STANDARD', 'NICHE', 'PENDING_REVIEW', 'ARCHIVED']);

export type InterestTierType = z.infer<typeof interestTierSchema>;

/**
 * @description
 * Represents the interest tier of a story, determining its
 * potential audience appeal and placement priority.
 *
 * @example
 * const tier = new InterestTier('STANDARD');
 */
export class InterestTier {
    public readonly value: InterestTierType;

    constructor(value: InterestTierType) {
        interestTierSchema.parse(value); // Fails if value is invalid
        this.value = value;
    }

    public toString(): InterestTierType {
        return this.value;
    }
}
