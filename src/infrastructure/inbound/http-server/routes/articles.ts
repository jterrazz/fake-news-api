import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import type { ArticleController } from '../controllers/article.controller.js';
import { getArticlesParamsSchema } from '../schemas/get-articles.schema.js';

export const createArticlesRouter = (articleController: ArticleController) => {
    const app = new Hono();

    app.get('/', async (c) => {
        const query = c.req.query();

        const validatedParams = getArticlesParamsSchema.safeParse({
            category: query.category,
            country: query.country,
            cursor: query.cursor,
            language: query.language,
            limit: query.limit,
        });

        if (!validatedParams.success) {
            throw new HTTPException(400, {
                cause: { details: validatedParams.error.issues },
                message: 'Invalid request parameters',
            });
        }

        const response = await articleController.getArticles(validatedParams.data);
        return c.json(response);
    });

    return app;
};
