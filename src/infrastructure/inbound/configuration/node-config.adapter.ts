import { LoggerLevelSchema } from '@jterrazz/logger';
import { z } from 'zod/v4';

import {
    type ConfigurationPort,
    type InboundConfigurationPort,
    type OutboundConfigurationPort,
} from '../../../application/ports/inbound/configuration.port.js';

const configurationSchema = z.object({
    inbound: z.object({
        env: z.enum(['development', 'production', 'test']),
        http: z.object({
            host: z.string(),
            port: z.coerce.number().int().positive(),
        }),
        logger: z.object({
            level: LoggerLevelSchema,
            prettyPrint: z.boolean(),
        }),
        tasks: z.object({
            articleGeneration: z
                .array(
                    z.object({
                        country: z.string().min(1, 'Country cannot be empty'),
                        language: z.string().min(1, 'Language cannot be empty'),
                    }),
                )
                .min(1, 'At least one article generation task is required'),
            storyDigest: z
                .array(
                    z.object({
                        country: z.string().min(1, 'Country cannot be empty'),
                        language: z.string().min(1, 'Language cannot be empty'),
                    }),
                )
                .optional()
                .default([]),
        }),
    }),
    outbound: z.object({
        newRelic: z.object({
            enabled: z.boolean(),
            licenseKey: z.string().optional(),
        }),
        openRouter: z.object({
            apiKey: z.string().min(1),
            budget: z.enum(['low', 'medium', 'high']),
        }),
        prisma: z.object({
            databaseUrl: z.string().min(1),
        }),
        worldNews: z.object({
            apiKey: z.string().min(1),
            useCache: z.coerce.boolean(),
        }),
    }),
});

type Configuration = z.infer<typeof configurationSchema>;

/**
 * Node.js configuration adapter that loads configuration from node-config
 */
export class NodeConfigAdapter implements ConfigurationPort {
    private readonly configuration: Configuration;

    constructor(configurationInput: unknown, overrides?: { databaseUrl?: string }) {
        // Parse and validate first
        const parsed = configurationSchema.parse(configurationInput);

        // Apply override after parsing
        if (overrides?.databaseUrl) {
            parsed.outbound.prisma.databaseUrl = overrides.databaseUrl;
        }

        this.configuration = parsed;
    }

    public getInboundConfiguration(): InboundConfigurationPort {
        return this.configuration.inbound;
    }

    public getOutboundConfiguration(): OutboundConfigurationPort {
        return this.configuration.outbound;
    }
}
