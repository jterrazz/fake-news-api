import { z } from 'zod/v4';

/**
 * Zod schema for the PublicationTier. It validates that the tier
 * is one of the allowed string literals.
 */
export const publicationTierSchema = z.enum(['STANDARD', 'NICHE', 'PENDING_REVIEW', 'ARCHIVED']);

export type PublicationTierType = z.infer<typeof publicationTierSchema>;

/**
 * @description
 * Represents the publication tier of an article, determining its
 * visibility and placement within the application.
 *
 * @example
 * const tier = new PublicationTier('STANDARD');
 */
export class PublicationTier {
    public readonly value: PublicationTierType;

    constructor(value: PublicationTierType) {
        publicationTierSchema.parse(value); // Fails if value is invalid
        this.value = value;
    }

    public toString(): PublicationTierType {
        return this.value;
    }
}
