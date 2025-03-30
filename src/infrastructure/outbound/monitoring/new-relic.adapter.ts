import newrelic from 'newrelic';

import { ConfigurationPort } from '../../../application/ports/inbound/configuration.port.js';

import { LoggerPort } from '../../../application/ports/outbound/logging/logger.port.js';

export class NewRelicAdapter {
    constructor(
        private readonly config: ConfigurationPort,
        private readonly logger: LoggerPort,
    ) {}

    public initialize(): void {
        const appConfig = this.config.getAppConfiguration();

        if (!appConfig.newRelic.enabled) {
            this.logger.info('New Relic monitoring is disabled');
            return;
        }

        if (!appConfig.newRelic.licenseKey) {
            this.logger.warn('New Relic license key is not set, monitoring will not be enabled');
            return;
        }

        try {
            // Initialize New Relic
            newrelic.addCustomAttribute('environment', appConfig.env);
            this.logger.info('New Relic monitoring initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize New Relic monitoring', { error });
        }
    }

    public static getInstance(config: ConfigurationPort, logger: LoggerPort): NewRelicAdapter {
        return new NewRelicAdapter(config, logger);
    }
}
