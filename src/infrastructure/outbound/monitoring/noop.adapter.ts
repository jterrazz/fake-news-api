import { LoggerPort } from '@jterrazz/logger';

import { MonitoringPort } from './monitoring.port.js';

export class NoopMonitoringAdapter implements MonitoringPort {
    constructor(private readonly logger: LoggerPort) {
        this.logger.info('Monitoring is disabled');
    }

    public endTransaction(): void {}

    public incrementMetric(_name: string, _value?: number): void {}

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

    public recordMetric(_name: string, _value: number): void {}

    public startTransaction(_name: string, _category: string): void {}
}
