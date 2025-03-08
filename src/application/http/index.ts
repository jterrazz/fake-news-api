import { Hono } from 'hono';

import { createArticlesRouter } from './articles.js';
import { createRootRouter } from './root.js';

export const createHttpServer = () => {
    const app = new Hono();

    // Mount all HTTP routers
    app.route('/', createRootRouter());
    app.route('/articles', createArticlesRouter());

    return app;
};
