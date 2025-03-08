import { initializeScheduler } from './infrastructure/inbound/jobs/scheduler.js';

import { getConfiguration, getHttpServer } from './di/container.js';

import './config/env.js';

// Start server with proper error handling
const start = async () => {
    try {
        const config = getConfiguration();
        const httpServer = getHttpServer();
        const appConfig = config.getAppConfiguration();

        // Initialize job scheduler
        await initializeScheduler();

        // Start HTTP server
        await httpServer.start({
            host: appConfig.host,
            port: appConfig.port,
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

start();
