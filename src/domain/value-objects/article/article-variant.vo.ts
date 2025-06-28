import { z } from 'zod/v4';

import { Body } from './body.vo.js';
import { Headline } from './headline.vo.js';

export const articleVariantSchema = z.object({
    body: z.instanceof(Body),
    discourse: z.enum(['mainstream', 'alternative', 'underreported', 'dubious']),
    headline: z.instanceof(Headline),
    stance: z.enum([
        'supportive',
        'critical',
        'neutral',
        'mixed',
        'concerned',
        'optimistic',
        'skeptical',
    ]),
});

export type ArticleVariantData = z.input<typeof articleVariantSchema>;

/**
 * @description Represents a specific viewpoint variant of an article
 * @example
 * const variant = new ArticleVariant({
 *   headline: new Headline("Critical Analysis of the Policy"),
 *   body: new Body("This policy raises significant concerns..."),
 *   stance: "critical",
 *   discourse: "alternative"
 * });
 */
export class ArticleVariant {
    public readonly body: Body;
    public readonly discourse: string;
    public readonly headline: Headline;
    public readonly stance: string;

    constructor(data: ArticleVariantData) {
        const result = articleVariantSchema.safeParse(data);

        if (!result.success) {
            throw new Error(`Invalid article variant data: ${result.error.message}`);
        }

        const validatedData = result.data;
        this.headline = validatedData.headline;
        this.body = validatedData.body;
        this.stance = validatedData.stance;
        this.discourse = validatedData.discourse;
    }
}
