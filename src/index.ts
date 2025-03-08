import { serve } from '@hono/node-server';

import { createHttpServer } from './application/http/index.js';
import { initializeScheduler } from './application/jobs/scheduler.js';

import './config/env.js';

// Start server with proper error handling
const startServer = async () => {
    console.log('Starting server');
    try {
        // Initialize job scheduler
        await initializeScheduler();

        // Start HTTP server
        const app = createHttpServer();
        serve(app, (info) => {
            console.log(`Server is running on port ${info.port}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
