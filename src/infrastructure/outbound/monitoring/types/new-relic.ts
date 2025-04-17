export interface NewRelicAPI {
    /**
     * Add a custom attribute to the current transaction
     */
    addCustomAttribute(name: string, value: boolean | null | number | string): void;

    /**
     * End the current transaction
     */
    endTransaction(): void;

    /**
     * Get the current transaction
     */
    getTransaction(): null | unknown;

    /**
     * Increment a metric counter
     */
    incrementMetric(name: string, value?: number): void;

    /**
     * Record a custom metric
     */
    recordMetric(name: string, value: number): void;

    /**
     * Start a background transaction
     */
    startBackgroundTransaction(name: string, group: string, handler: () => Promise<unknown>): void;

    /**
     * Start a new segment within the current transaction
     */
    startSegment<T>(name: string, record: boolean, handler: () => Promise<T>): Promise<T>;
}
