import { Hono } from 'hono';

import type { ArticleController } from '../controllers/article.controller.js';

export const createArticlesRouter = (articleController: ArticleController) => {
    const app = new Hono();

    app.get('/', async (c) => {
        try {
            const query = c.req.query();
            const params = {
                ...query,
                limit: query.limit ? Number(query.limit) : 20,
            };
            const response = await articleController.getArticles(params);
            return c.json(response);
        } catch (error) {
            return c.json(
                { error: error instanceof Error ? error.message : 'Failed to fetch articles' },
                500,
            );
        }
    });

    return app;
};
