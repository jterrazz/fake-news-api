import { z } from 'zod';

import {
    ApiConfiguration,
    AppConfiguration,
    ConfigurationPort,
} from '../../../application/ports/inbound/configuration.port.js';

const configurationSchema = z.object({
    api: z.object({
        gemini: z.object({
            apiKey: z.string().min(1),
        }),
        worldNews: z.object({
            apiKey: z.string().min(1),
        }),
    }),
    app: z.object({
        env: z.enum(['development', 'production', 'test']),
        port: z.number(),
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
        return this.configuration.app;
    }
}
