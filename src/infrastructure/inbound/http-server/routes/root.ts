import { Hono } from 'hono';

export const createRootRouter = () => {
    const app = new Hono();

    app.get('/', (c) => c.text('OK'));

    return app;
};
