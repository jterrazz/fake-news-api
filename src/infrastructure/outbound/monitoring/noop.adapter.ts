import { LoggerPort } from '@jterrazz/logger';

import { MonitoringPort } from './monitoring.port.js';

/**
 * No-operation implementation of the monitoring service.
 * Used when monitoring is disabled or not configured.
 * All operations are no-ops except for optional logging.
 */
export class NoopMonitoringAdapter implements MonitoringPort {
    constructor(private readonly logger?: LoggerPort) {
        this.logger?.info('Monitoring is disabled');
    }

    public async initialize(): Promise<void> {}

    public async monitorSegment<T>(_name: string, operation: () => Promise<T>): Promise<T> {
        return operation();
    }

    public async monitorTransaction<T>(
        _name: string,
        _category: string,
        operation: () => Promise<T>,
    ): Promise<T> {
        return operation();
    }

    public recordCount(_category: string, _name: string, _value?: number): void {}

    public recordMeasurement(_category: string, _name: string, _value: number): void {}
}
