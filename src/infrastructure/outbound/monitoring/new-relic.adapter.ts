import { LoggerPort } from '@jterrazz/logger';
// We only import types from newrelic, the actual implementation is dynamically imported
import type * as NewRelic from 'newrelic';
import type { TransactionHandle } from 'newrelic';

import { MonitoringPort } from './monitoring.port.js';

interface MonitoringOptions {
    environment: string;
    licenseKey?: string;
    logger?: LoggerPort;
}

/**
 * NewRelic implementation of the monitoring service.
 * Provides application monitoring and observability through NewRelic's APM.
 */
export class NewRelicMonitoringAdapter implements MonitoringPort {
    private agent: null | typeof NewRelic = null;
    private readonly logger?: LoggerPort;

    constructor(private readonly options: MonitoringOptions) {
        this.logger = options.logger;
    }

    public async initialize(): Promise<void> {
        if (!this.options.licenseKey) {
            this.logger?.warn('Monitoring license key is not set, monitoring will not be enabled');
            return;
        }

        try {
            // Initialize monitoring agent
            const newrelicModule = await import('newrelic');
            this.agent = newrelicModule.default;

            // Add environment attributes
            this.agent.addCustomAttribute('environment', this.options.environment);
            this.logger?.info('Monitoring initialized successfully');
        } catch (error) {
            this.logger?.error('Failed to initialize monitoring', { error });
        }
    }

    public async monitorSegment<T>(name: string, operation: () => Promise<T>): Promise<T> {
        if (!this.agent) {
            return operation();
        }

        const startTime = Date.now();
        try {
            const transaction = this.agent.getTransaction() as null | TransactionHandle;
            if (!transaction) {
                this.logger?.error('No parent operation found while monitoring sub-operation', {
                    name,
                });
            }

            return await this.agent.startSegment(name, true, operation);
        } finally {
            const duration = Date.now() - startTime;
            this.logger?.debug('Monitored sub-operation', { duration, name });
        }
    }

    public async monitorTransaction<T>(
        category: string,
        name: string,
        operation: () => Promise<T>,
    ): Promise<T> {
        if (!this.agent) {
            return operation();
        }

        return new Promise((resolve, reject) => {
            this.agent!.startBackgroundTransaction(name, category, async () => {
                try {
                    this.logger?.debug('Started operation monitoring', { category, name });
                    const result = await operation();
                    resolve(result);
                } catch (error) {
                    reject(error);
                } finally {
                    this.agent!.endTransaction();
                    this.logger?.debug('Ended operation monitoring', { category, name });
                }
            });
        });
    }

    public recordCount(category: string, name: string, value = 1): void {
        if (!this.agent) {
            return;
        }

        this.agent.recordMetric(`${category}/${name}`, value);
        this.logger?.debug('Recorded count metric', { category, name, value });
    }

    public recordMeasurement(category: string, name: string, value: number): void {
        if (!this.agent) {
            return;
        }

        const metricName = `${category}/${name}`;
        this.agent.recordMetric(metricName, value);
        this.logger?.debug('Recorded measurement', { category, name, value });
    }
}
