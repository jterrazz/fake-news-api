import { type LoggerLevel } from '@jterrazz/logger';

/**
 * API configuration
 */
export interface ApiConfigurationPort {
    openRouter: {
        apiKey: string;
        budget: 'free' | 'paid';
    };
    worldNews: {
        apiKey: string;
        useCache: boolean;
    };
}

/**
 * App configuration
 */
export interface AppConfigurationPort {
    databaseUrl: string;
    env: 'development' | 'production' | 'test';
    host: string;
    logging: {
        level: LoggerLevel;
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
    getApiConfiguration(): ApiConfigurationPort;

    /**
     * Get the application configuration
     */
    getAppConfiguration(): AppConfigurationPort;
}

/**
 * New Relic configuration
 */
export interface NewRelicConfiguration {
    enabled: boolean;
    licenseKey?: string;
}
