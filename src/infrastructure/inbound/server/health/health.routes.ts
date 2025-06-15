import { Hono } from 'hono';

export const createHealthRouter = () => {
    const app = new Hono();

    app.get('/', (c) => c.text('OK'));

    return app;
};
