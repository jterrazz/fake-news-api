import { getConfiguration, getHttpServer, getJobRunner, getLogger } from './di/container.js';

import './config/env.js';

// Start server with proper error handling
const start = async () => {
    const logger = getLogger();

    try {
        logger.info('Starting application...');

        const config = getConfiguration();
        const httpServer = getHttpServer();
        const jobRunner = getJobRunner();
        const appConfig = config.getAppConfiguration();

        // Initialize jobs
        logger.info('Initializing job runner...');
        await jobRunner.initialize();

        // Start HTTP server
        logger.info(`Starting HTTP server on ${appConfig.host}:${appConfig.port}...`);
        await httpServer.start({
            host: appConfig.host,
            port: appConfig.port,
        });

        logger.info('Application started successfully');
    } catch (error) {
        logger.error('Failed to start application', { error });
        process.exit(1);
    }
};

start();
