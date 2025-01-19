import { z } from 'zod';

export const ArticleSchema = z.object({
  article: z.string(),
  category: z.enum(['SCIENCE', 'TECHNOLOGY', 'HEALTH', 'ENVIRONMENT', 'SPACE']),
  createdAt: z.date(),
  headline: z.string(),
  id: z.string(),
  isFake: z.boolean(),
  summary: z.string()
});

export type Article = z.infer<typeof ArticleSchema>; 