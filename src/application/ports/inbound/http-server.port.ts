/**
 * Configuration for the HTTP server
 */
export interface HttpServerConfiguration {
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
 * HttpServer port - defines how the HTTP server can be started and stopped
 */
export interface HttpServerPort {
    /**
     * Make a test request to the server
     * @param path Must start with /
     */
    request(
        path: `/${string}`,
        options?: { body?: object | string; headers?: Record<string, string>; method?: string },
    ): Promise<Response>;

    /**
     * Start the HTTP server with the given configuration
     */
    start(config: HttpServerConfiguration): Promise<void>;

    /**
     * Stop the HTTP server gracefully
     */
    stop(): Promise<void>;
}
