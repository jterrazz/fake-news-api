import { getConfiguration, getHttpServer, getJobRunner } from './di/container.js';

import './config/env.js';

// Start server with proper error handling
const start = async () => {
    try {
        const config = getConfiguration();
        const httpServer = getHttpServer();
        const jobRunner = getJobRunner();
        const appConfig = config.getAppConfiguration();

        // Initialize jobs
        await jobRunner.initialize();

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
