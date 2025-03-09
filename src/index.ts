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
        const { host, port } = config.getAppConfiguration();

        // Initialize jobs
        logger.info('Initializing job runner...');
        await jobRunner.initialize();

        // Start HTTP server
        logger.info(`Starting HTTP server on ${host}:${port}...`);
        await httpServer.start({
            host,
            port,
        });

        logger.info('Application started successfully');
    } catch (error) {
        logger.error('Failed to start application', { error });
        process.exit(1);
    }
};

start();
