import { Hono } from 'hono';

import { type ArticleController } from './article.controller.js';

export const createArticlesRouter = (articleController: ArticleController) => {
    const app = new Hono();

    app.get('/', async (c) => {
        const query = c.req.query();

        const response = await articleController.getArticles({
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
