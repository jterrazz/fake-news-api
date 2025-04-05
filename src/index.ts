import { container } from './di/container.js';

// Start server with proper error handling
const start = async () => {
    const logger = container.get('Logger');

    try {
        logger.info('Starting application 🚀');

        const config = container.get('Configuration');
        const newRelic = container.get('NewRelic');
        const httpServer = container.get('HttpServer');
        const jobRunner = container.get('JobRunner');
        const { host, port } = config.getAppConfiguration();

        // Initialize New Relic monitoring
        await newRelic.initialize();

        // Initialize jobs
        await jobRunner.initialize();

        // Start HTTP server
        await httpServer.start({
            host,
            port,
        });

        logger.info('Application started successfully 🎉');
    } catch (error) {
        logger.error('Failed to start application 💥', { error });
        process.exit(1);
    }
};

start();
