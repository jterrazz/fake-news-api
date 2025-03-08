import { Article as PrismaArticle, Category, Country, Language } from '@prisma/client';
import { z } from 'zod';

export const ArticleSchema = z.object({
    article: z.string(),
    category: z.nativeEnum(Category),
    country: z.nativeEnum(Country),
    createdAt: z.date(),
    fakeReason: z.string().nullable(),
    headline: z.string(),
    id: z.string().uuid(),
    isFake: z.boolean(),
    language: z.nativeEnum(Language),
    summary: z.string(),
});

export type Article = PrismaArticle;

export { Category, Country, Language };
