import { Hono } from 'hono';

import { getArticleRepository } from '../../../../di/container.js';
import { ArticleController } from '../controllers/article.controller.js';

export const createArticlesRouter = () => {
    const app = new Hono();
    const articleRepository = getArticleRepository();
    const articleController = new ArticleController(articleRepository);

    app.get('/', async (c) => {
        try {
            const query = c.req.query();
            const response = await articleController.getArticles({
                category: query.category,
                country: query.country,
                cursor: query.cursor,
                language: query.language,
                limit: query.limit ? Number(query.limit) : 10,
            });
            return c.json(response);
        } catch (error) {
            console.error('Failed to fetch articles:', error);
            return c.json(
                { error: error instanceof Error ? error.message : 'Failed to fetch articles' },
                500,
            );
        }
    });

    return app;
};
