import type { Article } from '@prisma/client';
import { Hono } from 'hono';
import { z } from 'zod';

import { getArticleRepository } from '../../di/container.js';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

const paginationSchema = z.object({
    category: z
        .enum([
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
        ])
        .optional(),
    country: z.enum(['us', 'fr']).optional(),
    cursor: z.string().optional(),
    language: z.enum(['en', 'fr']).default('en'),
    limit: z.coerce.number().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

type PaginatedResponse<T> = {
    items: T[];
    nextCursor: string | null;
    total: number;
};

export const createArticlesRouter = () => {
    const app = new Hono();
    const articleRepository = getArticleRepository();

    app.get('/', async (c) => {
        try {
            const query = c.req.query();
            const validatedParams = paginationSchema.safeParse({
                category: query.category,
                country: query.country,
                cursor: query.cursor,
                language: query.language,
                limit: query.limit ? Number(query.limit) : DEFAULT_PAGE_SIZE,
            });

            if (!validatedParams.success)
                return c.json({ error: 'Invalid pagination parameters' }, 400);

            const { cursor, limit, category, language, country } = validatedParams.data;

            // Decode cursor if provided
            let cursorDate: Date | undefined;
            if (cursor) {
                try {
                    const timestamp = Number(atob(cursor));
                    if (isNaN(timestamp)) throw new Error('Invalid cursor timestamp');
                    cursorDate = new Date(timestamp);
                } catch {
                    return c.json({ error: 'Invalid cursor' }, 400);
                }
            }

            const { items, total } = await articleRepository.findMany({
                category,
                country,
                cursor: cursorDate,
                language,
                limit,
            });

            // Check if there are more items
            const hasMore = items.length > limit;
            const results = items.slice(0, limit);

            // Generate next cursor
            const nextCursor = hasMore
                ? Buffer.from(results[results.length - 1].createdAt.getTime().toString()).toString(
                      'base64',
                  )
                : null;

            const response: PaginatedResponse<Article> = {
                items: results,
                nextCursor,
                total,
            };

            return c.json(response);
        } catch (error) {
            console.error('Failed to fetch articles:', error);
            return c.json({ error: 'Failed to fetch articles' }, 500);
        }
    });

    return app;
};
