import { z } from 'zod';

const fakeStatusSchema = z
    .object({
        isFake: z.boolean().default(false),
        reason: z.string().nullable().default(null),
    })
    .refine((data) => !data.isFake || (data.isFake && data.reason), {
        message: 'Fake articles must have a reason specified',
        path: ['reason'],
    });

type FakeStatusProps = z.infer<typeof fakeStatusSchema>;

export class ArticleFakeStatus {
    private constructor(
        public readonly isFake: boolean,
        public readonly reason: string | null,
    ) {}

    public static createNonFake(): ArticleFakeStatus {
        return new ArticleFakeStatus(false, null);
    }

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

    public markAsFake(reason: string): ArticleFakeStatus {
        return ArticleFakeStatus.createFake(reason);
    }

    public equals(other: ArticleFakeStatus): boolean {
        return this.isFake === other.isFake && this.reason === other.reason;
    }

    public toString(): string {
        return this.isFake ? `Fake article (Reason: ${this.reason})` : 'Legitimate article';
    }
}
