import { type LoggerLevel } from '@jterrazz/logger';

/**
 * Article generation task configuration
 */
export interface ArticleGenerationTaskConfig {
    country: string;
    language: string;
}

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
    tasks: TasksConfigurationPort;
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
        budget: 'high' | 'low' | 'medium';
    };
    prisma: {
        databaseUrl: string;
    };
    worldNews: {
        apiKey: string;
        useCache: boolean;
    };
}

/**
 * Story digest task configuration
 */
export interface StoryDigestTaskConfig {
    country: string;
    language: string;
}

/**
 * Tasks configuration
 */
export interface TasksConfigurationPort {
    articleGeneration: ArticleGenerationTaskConfig[];
    storyDigest: StoryDigestTaskConfig[];
}
