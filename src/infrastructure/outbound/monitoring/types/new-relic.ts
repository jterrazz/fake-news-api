export interface NewRelicAPI {
    /**
     * Add a custom attribute that will be sent with all events
     */
    addCustomAttribute(key: string, value: string | number | boolean): void;

    /**
     * Record a custom metric
     */
    recordMetric(name: string, value: number): void;

    /**
     * Start a custom segment for timing
     */
    startSegment<T>(name: string, record: boolean, handler: () => Promise<T>): Promise<T>;

    /**
     * Increment a custom metric counter
     */
    incrementMetric(name: string, value?: number): void;

    /**
     * Start a background transaction
     */
    startBackgroundTransaction(
        name: string,
        group: string,
        handler: () => Promise<unknown>,
    ): void;

    /**
     * End the current transaction
     */
    endTransaction(): void;
}
