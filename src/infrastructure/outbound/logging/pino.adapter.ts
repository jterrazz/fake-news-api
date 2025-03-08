import pino from 'pino';

import type { LoggerPort } from '../../../../application/outbound/ports/services/logger.port.js';

export class PinoLoggerAdapter implements LoggerPort {
    private logger: pino.Logger;

    constructor(options?: pino.LoggerOptions) {
        this.logger = pino({
            level: process.env.LOG_LEVEL || 'info',
            ...options,
        });
    }

    info(message: string, context?: Record<string, unknown>): void {
        this.logger.info(context, message);
    }

    error(message: string, error?: Error, context?: Record<string, unknown>): void {
        this.logger.error(
            {
                ...context,
                error: error ? { message: error.message, stack: error.stack } : undefined,
            },
            message,
        );
    }

    warn(message: string, context?: Record<string, unknown>): void {
        this.logger.warn(context, message);
    }

    debug(message: string, context?: Record<string, unknown>): void {
        this.logger.debug(context, message);
    }

    child(bindings: Record<string, unknown>): LoggerPort {
        const childLogger = new PinoLoggerAdapter();
        childLogger.logger = this.logger.child(bindings);
        return childLogger;
    }
}
