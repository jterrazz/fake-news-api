import { serve } from '@hono/node-server';
import { type LoggerPort } from '@jterrazz/logger';
import { Hono } from 'hono';

import {
    type HttpServerConfiguration,
    type HttpServerPort,
} from '../../../application/ports/inbound/http-server.port.js';

import type { ArticleController } from './controllers/article.controller.js';
import { createArticlesRouter } from './routes/articles.js';
import { createHealthRouter } from './routes/health.js';

export class HonoServerAdapter implements HttpServerPort {
    private app: Hono;
    private server: null | ReturnType<typeof serve> = null;

    constructor(
        private readonly logger: LoggerPort,
        private readonly articleController: ArticleController,
    ) {
        this.app = new Hono();
        this.registerRoutes();
    }

    public async request(
        path: `/${string}`,
        options?: { body?: object | string; headers?: Record<string, string>; method?: string },
    ): Promise<Response> {
        const init: RequestInit = {
            body: options?.body ? JSON.stringify(options.body) : undefined,
            headers: options?.headers,
            method: options?.method,
        };
        return this.app.request(path, init);
    }

    public async start(config: HttpServerConfiguration): Promise<void> {
        return new Promise((resolve) => {
            this.server = serve(this.app, (info) => {
                this.logger.info(`Server is listening on ${config.host}:${info.port}`);
                resolve();
            });
        });
    }

    public async stop(): Promise<void> {
        if (this.server) {
            await this.server.close();
            this.server = null;
            this.logger.info('Server stopped');
        }
    }

    private registerRoutes(): void {
        this.app.route('/', createHealthRouter());
        this.app.route('/articles', createArticlesRouter(this.articleController));
    }
}
