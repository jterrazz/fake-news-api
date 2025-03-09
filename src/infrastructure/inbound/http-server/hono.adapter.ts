import { serve, Server } from '@hono/node-server';
import { Hono } from 'hono';

import {
    HttpServerConfiguration,
    HttpServerPort,
} from '../../../application/ports/inbound/http-server.port.js';

import { createArticlesRouter } from './routes/articles.js';
import { createRootRouter } from './routes/root.js';

export class HonoServerAdapter implements HttpServerPort {
    private app: Hono;
    private server: Server | null = null;

    constructor() {
        this.app = new Hono();
    }

    private registerRoutes(): void {
        // Mount all HTTP routers
        this.app.route('/', createRootRouter());
        this.app.route('/articles', createArticlesRouter());
    }

    public async start(config: HttpServerConfiguration): Promise<void> {
        this.registerRoutes();

        return new Promise((resolve) => {
            this.server = serve(this.app, (info) => {
                console.log(`Server is running on ${config.host}:${info.port}`);
                resolve();
            });
        });
    }

    public async stop(): Promise<void> {
        if (this.server) {
            await this.server.close();
            this.server = null;
        }
    }
}
