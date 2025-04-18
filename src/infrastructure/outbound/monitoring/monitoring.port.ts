/**
 * Port for application monitoring and observability.
 * Provides capabilities for tracking metrics, transactions, and performance segments.
 */
export interface MonitoringService {
    /**
     * Initialize the monitoring service with required configuration
     */
    initialize(): Promise<void>;

    /**
     * Monitor a business transaction with automatic error handling and timing
     * @param category - The category or domain of the transaction
     * @param name - The name of the transaction
     * @param operation - The operation to monitor
     */
    monitorOperation<T>(category: string, name: string, operation: () => Promise<T>): Promise<T>;

    /**
     * Monitor a sub-operation or segment within a transaction
     * @param name - The name of the segment
     * @param operation - The operation to monitor
     */
    monitorSubOperation<T>(name: string, operation: () => Promise<T>): Promise<T>;

    /**
     * Record a counter metric with an optional value
     * @param category - The category or domain of the metric
     * @param name - The name of the metric to increment
     * @param value - The value to increment by (defaults to 1)
     */
    recordCount(category: string, name: string, value?: number): void;

    /**
     * Record a measurement metric with a specific value
     * @param category - The category or domain of the metric
     * @param name - The name of the metric
     * @param value - The value to record
     */
    recordMeasurement(category: string, name: string, value: number): void;
}
