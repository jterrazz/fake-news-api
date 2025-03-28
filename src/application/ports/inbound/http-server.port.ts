/**
 * Configuration for the HTTP server
 */
export interface HttpServerConfiguration {
    /**
     * The port to listen on
     */
    port: number;

    /**
     * The host to listen on
     */
    host: string;
}

/**
 * HttpServer port - defines how the HTTP server can be started and stopped
 */
export interface HttpServerPort {
    /**
     * Start the HTTP server with the given configuration
     */
    start(config: HttpServerConfiguration): Promise<void>;

    /**
     * Stop the HTTP server gracefully
     */
    stop(): Promise<void>;

    /**
     * Make a test request to the server
     * @param path Must start with /
     */
    request(
        path: `/${string}`,
        options?: { method?: string; body?: string | object; headers?: Record<string, string> },
    ): Promise<Response>;
}
