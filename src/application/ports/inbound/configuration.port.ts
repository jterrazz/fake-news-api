import { type LoggerLevel } from '@jterrazz/logger';

/**
 * Configuration port - defines how the application can be configured
 */
export interface ConfigurationPort {
    /**
     * Get the inbound configuration
     */
    getInboundConfiguration(): InboundConfigurationPort;

    /**
     * Get the outbound configuration
     */
    getOutboundConfiguration(): OutboundConfigurationPort;
}

/**
 * Inbound configuration
 */
export interface InboundConfigurationPort {
    env: 'development' | 'production' | 'test';
    http: {
        host: string;
        port: number;
    };
    logger: {
        level: LoggerLevel;
        prettyPrint: boolean;
    };
}

/**
 * Outbound configuration
 */
export interface OutboundConfigurationPort {
    newRelic: {
        enabled: boolean;
        licenseKey?: string;
    };
    openRouter: {
        apiKey: string;
        budget: 'free' | 'paid';
    };
    prisma: {
        databaseUrl: string;
    };
    worldNews: {
        apiKey: string;
        useCache: boolean;
    };
}
