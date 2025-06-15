import { Hono } from 'hono';

import { type GetArticlesController } from './article.controller.js';

export const createArticlesRouter = (getArticlesController: GetArticlesController) => {
    const app = new Hono();

    app.get('/', async (c) => {
        const query = c.req.query();

        const response = await getArticlesController.getArticles({
            category: query.category,
            country: query.country,
            cursor: query.cursor,
            language: query.language,
            limit: query.limit,
        });

        return c.json(response);
    });

    return app;
};
