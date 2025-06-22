import { describe, expect, test } from '@jterrazz/test';
import { ZodError } from 'zod/v4';

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
            tasks: {
                articleGeneration: [
                    {
                        country: 'fr',
                        language: 'fr',
                    },
                    {
                        country: 'us',
                        language: 'en',
                    },
                ],
            },
        },
        outbound: {
            newRelic: {
                enabled: false,
            },
            openRouter: {
                apiKey: 'test-openrouter-key',
                budget: 'low',
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

    test('should load valid configuration', () => {
        // Given - a valid configuration object
        // When - creating a NodeConfigAdapter instance
        const configAdapter = new NodeConfigAdapter(validConfig);
        // Then - it should return the correct inbound and outbound configuration
        expect(configAdapter.getInboundConfiguration()).toEqual(validConfig.inbound);
        expect(configAdapter.getOutboundConfiguration()).toEqual(validConfig.outbound);
    });

    test('should fail with invalid environment', () => {
        // Given - a configuration with an invalid environment
        const invalidConfig = {
            ...validConfig,
            inbound: {
                ...validConfig.inbound,
                env: 'invalid-env',
            },
        };
        // When/Then - creating a NodeConfigAdapter should throw a ZodError
        expect(() => new NodeConfigAdapter(invalidConfig)).toThrow(ZodError);
    });

    test('should fail with missing API keys', () => {
        // Given - a configuration with missing API keys
        const invalidConfig = {
            ...validConfig,
            outbound: {
                ...validConfig.outbound,
                worldNews: { apiKey: '' },
            },
        };
        // When/Then - creating a NodeConfigAdapter should throw a ZodError
        expect(() => new NodeConfigAdapter(invalidConfig)).toThrow(ZodError);
    });

    test('should fail with invalid port', () => {
        // Given - a configuration with an invalid port
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
        // When/Then - creating a NodeConfigAdapter should throw a ZodError
        expect(() => new NodeConfigAdapter(invalidConfig)).toThrow(ZodError);
    });

    test('should fail with invalid log level', () => {
        // Given - a configuration with an invalid log level
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
        // When/Then - creating a NodeConfigAdapter should throw a ZodError
        expect(() => new NodeConfigAdapter(invalidConfig)).toThrow(ZodError);
    });

    test('should fail with missing host', () => {
        // Given - a configuration with missing host in http
        const invalidConfig = {
            ...validConfig,
            inbound: {
                ...validConfig.inbound,
                http: {
                    port: 3000,
                },
            },
        };
        // When/Then - creating a NodeConfigAdapter should throw a ZodError
        expect(() => new NodeConfigAdapter(invalidConfig)).toThrow(ZodError);
    });

    test('should fail with missing tasks configuration', () => {
        // Given - a configuration with missing tasks
        const invalidConfig = {
            ...validConfig,
            inbound: {
                ...validConfig.inbound,
                tasks: undefined,
            },
        };
        // When/Then - creating a NodeConfigAdapter should throw a ZodError
        expect(() => new NodeConfigAdapter(invalidConfig)).toThrow(ZodError);
    });

    test('should fail with empty article generation tasks', () => {
        // Given - a configuration with empty article generation tasks
        const invalidConfig = {
            ...validConfig,
            inbound: {
                ...validConfig.inbound,
                tasks: {
                    articleGeneration: [],
                },
            },
        };
        // When/Then - creating a NodeConfigAdapter should throw a ZodError
        expect(() => new NodeConfigAdapter(invalidConfig)).toThrow(ZodError);
    });

    test('should fail with invalid task configuration', () => {
        // Given - a configuration with invalid task configuration
        const invalidConfig = {
            ...validConfig,
            inbound: {
                ...validConfig.inbound,
                tasks: {
                    articleGeneration: [
                        {
                            country: '', // Invalid empty country
                            language: 'fr',
                        },
                    ],
                },
            },
        };
        // When/Then - creating a NodeConfigAdapter should throw a ZodError
        expect(() => new NodeConfigAdapter(invalidConfig)).toThrow(ZodError);
    });
});
