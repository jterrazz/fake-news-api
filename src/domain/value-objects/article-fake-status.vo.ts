import { z } from 'zod/v4';

export const fakeStatusSchema = z
    .object({
        isFake: z.boolean().default(false),
        reason: z.string().nullable().default(null),
    })
    .refine((data) => !data.isFake || (data.isFake && data.reason), {
        message: 'Fake articles must have a reason specified',
        path: ['reason'],
    });

export class ArticleFakeStatus {
    private constructor(
        public readonly isFake: boolean,
        public readonly reason: null | string,
    ) {}

    public static createFake(reason: string): ArticleFakeStatus {
        const result = fakeStatusSchema.safeParse({
            isFake: true,
            reason,
        });

        if (!result.success) {
            throw new Error(`Invalid fake status: ${result.error.message}`);
        }

        return new ArticleFakeStatus(true, result.data.reason);
    }

    public static createNonFake(): ArticleFakeStatus {
        return new ArticleFakeStatus(false, null);
    }

    public markAsFake(reason: string): ArticleFakeStatus {
        return ArticleFakeStatus.createFake(reason);
    }

    public toString(): string {
        return this.isFake ? `Fake article (Reason: ${this.reason})` : 'Legitimate article';
    }
}
