import { describe, expect, it } from '@jterrazz/test';
import { ZodError } from 'zod';

import { NodeConfigAdapter } from '../node-config.adapter.js';

describe('Node Config Adapter', () => {
    const validConfig = {
        inbound: {
            env: 'development',
            http: {
                host: 'localhost',
                port: 3000,
            },
            logger: {
                level: 'info',
                prettyPrint: false,
            },
        },
        outbound: {
            newRelic: {
                enabled: false,
            },
            openRouter: {
                apiKey: 'test-openrouter-key',
                budget: 'free',
            },
            prisma: {
                databaseUrl: 'file:./database/test.sqlite',
            },
            worldNews: {
                apiKey: 'test-world-news-key',
                useCache: false,
            },
        },
    };

    it('should load valid configuration', () => {
        const configAdapter = new NodeConfigAdapter(validConfig);

        expect(configAdapter.getInboundConfiguration()).toEqual(validConfig.inbound);
        expect(configAdapter.getOutboundConfiguration()).toEqual(validConfig.outbound);
    });

    it('should fail with invalid environment', () => {
        const invalidConfig = {
            ...validConfig,
            inbound: {
                ...validConfig.inbound,
                env: 'invalid-env',
            },
        };

        expect(() => new NodeConfigAdapter(invalidConfig)).toThrow(ZodError);
    });

    it('should fail with missing API keys', () => {
        const invalidConfig = {
            ...validConfig,
            outbound: {
                ...validConfig.outbound,
                worldNews: { apiKey: '' },
            },
        };

        expect(() => new NodeConfigAdapter(invalidConfig)).toThrow(ZodError);
    });

    it('should fail with invalid port', () => {
        const invalidConfig = {
            ...validConfig,
            inbound: {
                ...validConfig.inbound,
                http: {
                    ...validConfig.inbound.http,
                    port: 'invalid-port',
                },
            },
        };

        expect(() => new NodeConfigAdapter(invalidConfig)).toThrow(ZodError);
    });

    it('should fail with invalid log level', () => {
        const invalidConfig = {
            ...validConfig,
            inbound: {
                ...validConfig.inbound,
                logger: {
                    ...validConfig.inbound.logger,
                    level: 'invalid-level',
                },
            },
        };

        expect(() => new NodeConfigAdapter(invalidConfig)).toThrow(ZodError);
    });

    it('should fail with missing host', () => {
        const invalidConfig = {
            ...validConfig,
            inbound: {
                ...validConfig.inbound,
                http: {
                    port: 3000,
                },
            },
        };

        expect(() => new NodeConfigAdapter(invalidConfig)).toThrow(ZodError);
    });
});
