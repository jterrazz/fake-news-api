export interface HttpServerConfiguration {
    port: number;
    host: string;
}

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
     * Register routes and middleware
     */
    registerRoutes(): void;
}
