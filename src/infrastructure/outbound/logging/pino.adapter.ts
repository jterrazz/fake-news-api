import pino from 'pino';

import { ConfigurationPort } from '../../../application/ports/inbound/configuration.port.js';

import { LoggerPort } from '../../../application/ports/outbound/logging/logger.port.js';

export class PinoLoggerAdapter implements LoggerPort {
    private logger: pino.Logger;
    private config: ConfigurationPort;

    constructor(config: ConfigurationPort, options?: pino.LoggerOptions) {
        this.config = config;
        const appConfig = config.getAppConfiguration();

        const isDevEnvironment = appConfig.env === 'development';
        const transport = isDevEnvironment
            ? {
                  options: {
                      colorize: true,
                      colorizeObjects: false,
                      ignore: 'pid,hostname',
                      levelFirst: true,
                      messageFormat: false,
                      singleLine: true,
                      translateTime: 'HH:MM:ss.l',
                  },
                  target: 'pino-pretty',
              }
            : undefined;

        this.logger = pino({
            formatters: {
                level: (label) => ({ level: label.toUpperCase() }),
            },
            level: appConfig.logging.level,
            transport,
            ...options,
        });
    }

    private formatContext(context?: Record<string, unknown>): Record<string, unknown> {
        if (!context) return {};

        // Format error objects specially
        if (context.error instanceof Error) {
            const { message, ...errorRest } = context.error;
            return {
                ...context,
                error: {
                    stack: context.error.stack,
                    ...errorRest,
                },
            };
        }

        return context;
    }

    info(message: string, context?: Record<string, unknown>): void {
        this.logger.info(this.formatContext(context), message);
    }

    error(message: string, context?: Record<string, unknown>): void {
        this.logger.error(this.formatContext(context), message);
    }

    warn(message: string, context?: Record<string, unknown>): void {
        this.logger.warn(this.formatContext(context), message);
    }

    debug(message: string, context?: Record<string, unknown>): void {
        this.logger.debug(this.formatContext(context), message);
    }

    child(bindings: Record<string, unknown>): LoggerPort {
        const childLogger = new PinoLoggerAdapter(this.config);
        childLogger.logger = this.logger.child(bindings);
        return childLogger;
    }
}
