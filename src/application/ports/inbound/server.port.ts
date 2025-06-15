/**
 * Configuration for the server
 */
export interface ServerConfiguration {
    /**
     * The host to listen on
     */
    host: string;

    /**
     * The port to listen on
     */
    port: number;
}

/**
 * Server port - defines how the server can be started and stopped
 */
export interface ServerPort {
    /**
     * Make a test request to the server
     */
    request(
        path: string,
        options?: { body?: object | string; headers?: Record<string, string>; method?: string },
    ): Promise<Response>;

    /**
     * Start the server with the given configuration
     */
    start(config: ServerConfiguration): Promise<void>;

    /**
     * Stop the server gracefully
     */
    stop(): Promise<void>;
}
