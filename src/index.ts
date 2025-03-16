import { getConfiguration, getHttpServer, getJobRunner, getLogger } from './di/container.js';

// Start server with proper error handling
console.log(process.env.NODE_ENV);
const start = async () => {
    const logger = getLogger();

    try {
        logger.info('Starting application...');

        const config = getConfiguration();
        const httpServer = getHttpServer();
        const jobRunner = getJobRunner();
        const { host, port } = config.getAppConfiguration();

        // Initialize jobs
        await jobRunner.initialize();

        // Start HTTP server
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
