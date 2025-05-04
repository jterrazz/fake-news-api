import { createContainer } from './di/container.js';

const start = async () => {
    const container = createContainer();
    const logger = container.get('Logger');
    const config = container.get('Configuration');
    const newRelic = container.get('NewRelic');
    const httpServer = container.get('HttpServer');
    const jobRunner = container.get('JobRunner');

    try {
        logger.info('Starting application 🚀');

        const { host, port } = config.getInboundConfiguration().http;

        await newRelic.initialize();
        await jobRunner.initialize();
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
