/**
 * API configuration
 */
export interface ApiConfiguration {
    openRouter: {
        apiKey: string;
    };
    worldNews: {
        apiKey: string;
        useCache: boolean;
    };
}

/**
 * App configuration
 */
export interface AppConfiguration {
    env: 'development' | 'production' | 'test';
    host: string;
    logging: {
        level: 'debug' | 'error' | 'info' | 'warn';
    };
    newRelic: NewRelicConfiguration;
    port: number;
}

/**
 * Configuration port - defines how the application can be configured
 */
export interface ConfigurationPort {
    /**
     * Get the API configuration
     */
    getApiConfiguration(): ApiConfiguration;

    /**
     * Get the application configuration
     */
    getAppConfiguration(): AppConfiguration;
}

/**
 * New Relic configuration
 */
export interface NewRelicConfiguration {
    enabled: boolean;
    licenseKey?: string;
}
