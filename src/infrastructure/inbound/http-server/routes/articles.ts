import { Hono } from 'hono';

import { getArticlesParamsSchema } from '../../../../application/use-cases/articles/get-articles.use-case.js';

import type { ArticleController } from '../controllers/article.controller.js';

export const createArticlesRouter = (articleController: ArticleController) => {
    const app = new Hono();

    app.get('/', async (c) => {
        try {
            const query = c.req.query();

            // Parse and validate query parameters using the schema
            const validatedParams = getArticlesParamsSchema.safeParse({
                category: query.category,
                country: query.country?.toLowerCase(),
                cursor: query.cursor,
                language: query.language?.toLowerCase(),
                limit: query.limit ? Number(query.limit) : undefined,
            });

            if (!validatedParams.success) {
                return c.json(
                    { details: validatedParams.error.issues, error: 'Invalid request parameters' },
                    400,
                );
            }

            const response = await articleController.getArticles(validatedParams.data);
            return c.json(response);
        } catch (error) {
            console.error('Unexpected error in articles route:', error);
            return c.json(
                { error: error instanceof Error ? error.message : 'Failed to fetch articles' },
                500,
            );
        }
    });

    return app;
};
