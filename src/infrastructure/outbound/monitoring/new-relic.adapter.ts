import { LoggerPort } from '@jterrazz/logger';
// We only import types from newrelic, the actual implementation is dynamically imported
import type * as NewRelic from 'newrelic';
import type { TransactionHandle } from 'newrelic';

import { MonitoringPort } from './monitoring.port.js';

interface NewRelicAdapterOptions {
    environment: string;
    licenseKey?: string;
    logger?: LoggerPort;
}

export class NewRelicAdapter implements MonitoringPort {
    private readonly logger?: LoggerPort;
    private newrelic: null | typeof NewRelic = null;

    constructor(private readonly options: NewRelicAdapterOptions) {
        this.logger = options.logger;
    }

    public incrementMetric(name: string, value = 1): void {
        if (!this.newrelic) {
            return;
        }

        this.newrelic.incrementMetric(name, value);
        this.logger?.debug('Incremented metric', { name, value });
    }

    public async initialize(): Promise<void> {
        if (!this.options.licenseKey) {
            this.logger?.warn(
                '[INIT] New Relic license key is not set, monitoring will not be enabled',
            );
            return;
        }

        if (process.env.NODE_ENV !== 'production') {
            this.logger?.warn('[INIT] New Relic is only enabled in production environment');
            return;
        }

        try {
            // Initialize New Relic
            const newrelicModule = await import('newrelic');
            this.newrelic = newrelicModule.default;

            // Add environment attributes
            this.newrelic.addCustomAttribute('environment', this.options.environment);
            this.logger?.info('New Relic monitoring initialized successfully');
        } catch (error) {
            this.logger?.error('Failed to initialize New Relic monitoring', { error });
        }
    }

    public async monitorSegment<T>(name: string, operation: () => Promise<T>): Promise<T> {
        if (!this.newrelic) {
            return operation();
        }

        const startTime = Date.now();
        try {
            const transaction = this.newrelic.getTransaction() as null | TransactionHandle;
            if (!transaction) {
                this.logger?.error('No transaction found while monitoring segment', { name });
            }

            return await this.newrelic.startSegment(name, true, operation);
        } finally {
            const duration = Date.now() - startTime;
            this.logger?.debug('Monitored segment', { duration, name });
        }
    }

    public async monitorTransaction<T>(
        name: string,
        category: string,
        operation: () => Promise<T>,
    ): Promise<T> {
        if (!this.newrelic) {
            return operation();
        }

        return new Promise((resolve, reject) => {
            this.newrelic!.startBackgroundTransaction(name, category, async () => {
                try {
                    this.logger?.debug('Started transaction', { category, name });
                    const result = await operation();
                    resolve(result);
                } catch (error) {
                    this.logger?.error('Transaction failed', {
                        category,
                        error,
                        name,
                    });
                    reject(error);
                } finally {
                    this.newrelic!.endTransaction();
                    this.logger?.debug('Ended transaction', { category, name });
                }
            });
        });
    }

    public recordMetric(name: string, value: number): void {
        if (!this.newrelic) {
            return;
        }

        this.newrelic.recordMetric(name, value);
        this.logger?.debug('Recorded metric', { name, value });
    }
}
