import { Hono } from 'hono';

import { LanguageEnum } from '../../../../domain/value-objects/article-language.vo.js';

import { getArticleController } from '../../../../di/container.js';

export const createArticlesRouter = () => {
    const app = new Hono();
    const articleController = getArticleController();

    app.get('/', async (c) => {
        try {
            const query = c.req.query();
            const params = {
                ...query,
                language: (query.language || LanguageEnum.English) as LanguageEnum,
                limit: query.limit ? Number(query.limit) : 10,
            };
            const response = await articleController.getArticles(params);
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
