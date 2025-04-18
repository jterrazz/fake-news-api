export interface MonitoringPort {
    incrementMetric(name: string, value?: number): void;
    initialize(): Promise<void>;
    monitorSegment<T>(name: string, operation: () => Promise<T>): Promise<T>;
    monitorTransaction<T>(
        name: string,
        category: string,
        operation: () => Promise<T>,
    ): Promise<T>;
    recordMetric(name: string, value: number): void;
} 