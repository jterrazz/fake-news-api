import { z } from 'zod';

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

export type Configuration = z.infer<typeof configurationSchema>;

export class ConfigurationService {
    private readonly configuration: Configuration;

    constructor(configurationInput: unknown) {
        this.configuration = configurationSchema.parse(configurationInput);
    }

    public getConfiguration(): Configuration {
        return this.configuration;
    }

    public getApiConfiguration(): Configuration['api'] {
        return this.configuration.api;
    }

    public getAppConfiguration(): Configuration['app'] {
        return this.configuration.app;
    }
}
