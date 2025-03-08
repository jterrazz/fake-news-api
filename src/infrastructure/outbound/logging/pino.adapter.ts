import pino from 'pino';

import { ConfigurationPort } from '../../../application/ports/inbound/configuration.port.js';

import { LoggerPort } from '../../../application/ports/outbound/logging/logger.port.js';

export class PinoLoggerAdapter implements LoggerPort {
    private logger: pino.Logger;
    private config: ConfigurationPort;

    constructor(config: ConfigurationPort, options?: pino.LoggerOptions) {
        this.config = config;
        const appConfig = config.getAppConfiguration();

        this.logger = pino({
            level: appConfig.logging.level,
            ...options,
        });
    }

    info(message: string, context?: Record<string, unknown>): void {
        this.logger.info(context, message);
    }

    error(message: string, context?: Record<string, unknown>): void {
        this.logger.error(context, message);
    }

    warn(message: string, context?: Record<string, unknown>): void {
        this.logger.warn(context, message);
    }

    debug(message: string, context?: Record<string, unknown>): void {
        this.logger.debug(context, message);
    }

    child(bindings: Record<string, unknown>): LoggerPort {
        const childLogger = new PinoLoggerAdapter(this.config);
        childLogger.logger = this.logger.child(bindings);
        return childLogger;
    }
}
