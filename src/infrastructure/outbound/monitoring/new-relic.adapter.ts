import { LoggerPort } from '@jterrazz/logger';

import { ConfigurationPort } from '../../../application/ports/inbound/configuration.port.js';

import type { NewRelicAPI } from './types/new-relic.js';

export class NewRelicAdapter {
    private newrelic: NewRelicAPI | null = null;

    constructor(
        private readonly config: ConfigurationPort,
        private readonly logger: LoggerPort,
    ) {}

    // TODO Fix config leak
    public async initialize(): Promise<void> {
        const appConfig = this.config.getAppConfiguration();

        if (!appConfig.newRelic.enabled) {
            this.logger.info('Monitoring is disabled');
            return;
        }

        if (!appConfig.newRelic.licenseKey) {
            this.logger.warn(
                '[INIT] New Relic license key is not set, monitoring will not be enabled',
            );
            return;
        }

        if (process.env.NODE_ENV !== 'production') {
            this.logger.warn('[INIT] New Relic is only enabled in production environment');
            return;
        }

        try {
            // Initialize New Relic
            const newrelicModule = await import('newrelic');
            this.newrelic = newrelicModule.default;

            // Add environment attributes
            this.newrelic.addCustomAttribute('environment', appConfig.env);
            this.logger.info('New Relic monitoring initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize New Relic monitoring', { error });
        }
    }

    /**
     * Record a custom metric with a specific value
     */
    public recordMetric(name: string, value: number): void {
        if (this.newrelic) {
            this.newrelic.recordMetric(name, value);
            this.logger.debug('Recorded metric', { name, value });
        }
    }

    /**
     * Increment a counter metric
     */
    public incrementMetric(name: string, value = 1): void {
        if (this.newrelic) {
            this.newrelic.incrementMetric(name, value);
            this.logger.debug('Incremented metric', { name, value });
        }
    }

    /**
     * Monitor an async operation with timing
     */
    public async monitorSegment<T>(name: string, operation: () => Promise<T>): Promise<T> {
        if (!this.newrelic) {
            return operation();
        }

        const startTime = Date.now();
        try {
            // Create a transaction if one doesn't exist
            if (!this.newrelic.getTransaction()) {
                this.logger.error('No transaction found while monitoring segment', { name });
            }

            return await this.newrelic.startSegment(name, true, operation);
        } finally {
            const duration = Date.now() - startTime;
            this.logger.debug('Monitored segment', { duration, name });
        }
    }

    /**
     * Monitor a background job as a transaction
     */
    public async monitorBackgroundJob<T>(
        groupName: string,
        jobName: string,
        operation: () => Promise<T>,
    ): Promise<T> {
        if (!this.newrelic) {
            return operation();
        }

        return new Promise((resolve, reject) => {
            this.newrelic!.startBackgroundTransaction(jobName, groupName, async () => {
                try {
                    this.logger.debug('Started background transaction', { groupName, jobName });
                    const result = await operation();
                    resolve(result);
                } catch (error) {
                    this.logger.error('Background transaction failed', {
                        error,
                        groupName,
                        jobName,
                    });
                    reject(error);
                } finally {
                    this.newrelic!.endTransaction();
                    this.logger.debug('Ended background transaction', { groupName, jobName });
                }
            });
        });
    }

    public static getInstance(config: ConfigurationPort, logger: LoggerPort): NewRelicAdapter {
        return new NewRelicAdapter(config, logger);
    }
}
