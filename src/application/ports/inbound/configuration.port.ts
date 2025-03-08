export interface ApiConfiguration {
    gemini: {
        apiKey: string;
    };
    worldNews: {
        apiKey: string;
    };
}

export interface AppConfiguration {
    env: 'development' | 'production' | 'test';
    port: number;
    host: string;
    logging: {
        level: 'debug' | 'info' | 'warn' | 'error';
    };
}

/**
 * Configuration port - defines how the application can be configured
 * This is an inbound port because configuration drives application behavior
 */
export interface ConfigurationPort {
    getApiConfiguration(): ApiConfiguration;
    getAppConfiguration(): AppConfiguration;
}
