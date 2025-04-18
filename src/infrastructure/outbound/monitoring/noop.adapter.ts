import { LoggerPort } from '@jterrazz/logger';

import { MonitoringPort } from './monitoring.port.js';

export class NoopMonitoringAdapter implements MonitoringPort {
    constructor(private readonly logger: LoggerPort) {
        this.logger.info('Monitoring is disabled');
    }

    public incrementMetric(_name: string, _value?: number): void {}

    public async initialize(): Promise<void> {}

    public async monitorBackgroundJob<T>(
        _groupName: string,
        _jobName: string,
        operation: () => Promise<T>,
    ): Promise<T> {
        return operation();
    }

    public async monitorSegment<T>(_name: string, operation: () => Promise<T>): Promise<T> {
        return operation();
    }

    public recordMetric(_name: string, _value: number): void {}
}
