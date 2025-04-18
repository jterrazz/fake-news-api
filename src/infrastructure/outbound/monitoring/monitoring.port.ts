export interface MonitoringPort {
    incrementMetric(name: string, value?: number): void;
    initialize(): Promise<void>;
    monitorBackgroundJob<T>(
        groupName: string,
        jobName: string,
        operation: () => Promise<T>,
    ): Promise<T>;
    monitorSegment<T>(name: string, operation: () => Promise<T>): Promise<T>;
    recordMetric(name: string, value: number): void;
} 