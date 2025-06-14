import { z } from 'zod/v4';

export const authenticitySchema = z
    .object({
        isFake: z.boolean().default(false),
        reason: z.string().nullable().default(null),
    })
    .refine((data) => !data.isFake || (data.isFake && data.reason), {
        message: 'Fake articles must have a reason specified',
        path: ['reason'],
    });

export class Authenticity {
    public readonly isFake: boolean;
    public readonly reason: null | string;

    constructor(isFake: boolean, reason: null | string = null) {
        const result = authenticitySchema.safeParse({ isFake, reason });

        if (!result.success) {
            throw new Error(`Invalid authenticity: ${result.error.message}`);
        }

        this.isFake = result.data.isFake;
        this.reason = result.data.reason;
    }

    public toString(): string {
        return this.isFake ? `Fake article (Reason: ${this.reason})` : 'Legitimate article';
    }
}
