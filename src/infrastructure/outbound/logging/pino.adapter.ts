import pino from 'pino';

import { LoggerPort } from '../../../application/ports/outbound/logging/logger.port.js';

// TODO Migrate to package-logger
export class PinoLoggerAdapter implements LoggerPort {
    private logger: pino.Logger;

    constructor(
        private readonly config: {
            prettyPrint: boolean;
            level: string;
        },
    ) {
        const transport = this.config.prettyPrint
            ? {
                  options: {
                      colorize: true,
                      colorizeObjects: false,
                      ignore: 'pid,hostname',
                      levelFirst: true,
                      messageFormat: false,
                      singleLine: true,
                      translateTime: 'HH:MM:ss',
                  },
                  target: 'pino-pretty',
              }
            : undefined;

        this.logger = pino({
            formatters: {
                level: (label) => ({ level: label }),
            },
            level: this.config.level,
            transport,
        });
    }

    private formatContext(context?: Record<string, unknown>): Record<string, unknown> {
        if (!context) return {};

        // Format error objects specially
        if (context.error instanceof Error) {
            const { error, ...contextRest } = context;
            return {
                context: contextRest,
                error: {
                    ...error,
                    message: error.message,
                    stack: error.stack,
                },
            };
        }

        return {
            context,
        };
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
