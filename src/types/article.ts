import { z } from 'zod';

export const ArticleSchema = z.object({
    article: z.string(),
    category: z.enum([
        'WORLD',
        'POLITICS',
        'BUSINESS',
        'TECHNOLOGY',
        'SCIENCE',
        'HEALTH',
        'SPORTS',
        'ENTERTAINMENT',
        'LIFESTYLE',
        'OTHER',
    ]),
    country: z.enum(['us', 'fr']),
    createdAt: z.date(),
    headline: z.string(),
    id: z.string(),
    isFake: z.boolean(),
    language: z.enum(['en', 'fr']),
    summary: z.string(),
});

export type Article = z.infer<typeof ArticleSchema>;
