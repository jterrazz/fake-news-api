import { serve } from '@hono/node-server';
import { Hono } from 'hono';

import {
    HttpServerConfiguration,
    HttpServerPort,
} from '../../../application/ports/inbound/http-server.port.js';
import { LoggerPort } from '../../../application/ports/outbound/logging/logger.port.js';

import { createArticlesRouter } from './routes/articles.js';
import { createRootRouter } from './routes/root.js';

export class HonoServerAdapter implements HttpServerPort {
    private app: Hono;
    private server: ReturnType<typeof serve> | null = null;

    constructor(private readonly logger: LoggerPort) {
        this.app = new Hono();
        this.registerRoutes();
    }

    private registerRoutes(): void {
        // Mount all HTTP routers
        this.app.route('/', createRootRouter());
        this.app.route('/articles', createArticlesRouter());
    }

    public async start(config: HttpServerConfiguration): Promise<void> {
        return new Promise((resolve) => {
            this.server = serve(this.app, (info) => {
                this.logger.info('Server started', {
                    host: config.host,
                    port: info.port,
                });
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

    public async request(
        path: `/${string}`,
        options?: { method?: string; body?: string | object; headers?: Record<string, string> },
    ): Promise<Response> {
        const init: RequestInit = {
            body: options?.body ? JSON.stringify(options.body) : undefined,
            headers: options?.headers,
            method: options?.method,
        };
        return this.app.request(path, init);
    }
}
