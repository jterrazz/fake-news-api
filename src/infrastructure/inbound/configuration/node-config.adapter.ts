import { z } from 'zod';

import {
    ApiConfiguration,
    AppConfiguration,
    ConfigurationPort,
} from '../../../application/ports/inbound/configuration.port.js';

const configurationSchema = z.object({
    api: z.object({
        openRouter: z.object({
            apiKey: z.string().min(1),
        }),
        worldNews: z.object({
            apiKey: z.string().min(1),
            useCache: z.coerce.boolean(),
        }),
    }),
    app: z.object({
        env: z.enum(['development', 'production', 'test']),
        host: z.string(),
        newRelic: z.object({
            enabled: z.boolean(),
            licenseKey: z.string().optional(),
        }),
        port: z.coerce.number().int().positive(),
    }),
    logging: z.object({
        level: z.enum(['debug', 'info', 'warn', 'error']),
    }),
});

type Configuration = z.infer<typeof configurationSchema>;

/**
 * Node.js configuration adapter that loads configuration from node-config
 */
export class NodeConfigAdapter implements ConfigurationPort {
    private readonly configuration: Configuration;

    constructor(configurationInput: unknown) {
        this.configuration = configurationSchema.parse(configurationInput);
    }

    public getApiConfiguration(): ApiConfiguration {
        return this.configuration.api;
    }

    public getAppConfiguration(): AppConfiguration {
        return {
            ...this.configuration.app,
            logging: this.configuration.logging,
        };
    }
}
