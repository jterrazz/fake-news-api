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
                storyDigest: [
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

    test('should load configuration with default empty storyDigest when not provided', () => {
        // Given - a valid configuration without storyDigest tasks
        const configWithoutTasks = {
            ...validConfig,
            inbound: {
                ...validConfig.inbound,
                tasks: {
                    storyDigest: undefined,
                },
            },
        };
        // When - creating a NodeConfigAdapter instance
        const configAdapter = new NodeConfigAdapter(configWithoutTasks);
        // Then - it should return configuration with empty storyDigest array
        expect(configAdapter.getInboundConfiguration().tasks.storyDigest).toEqual([]);
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

    test('should fail with invalid story digest task configuration', () => {
        // Given - a configuration with invalid task configuration
        const invalidConfig = {
            ...validConfig,
            inbound: {
                ...validConfig.inbound,
                tasks: {
                    storyDigest: [
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

    test('should fail with invalid country in story digest task', () => {
        // Given - a configuration with invalid country
        const invalidConfig = {
            ...validConfig,
            inbound: {
                ...validConfig.inbound,
                tasks: {
                    storyDigest: [
                        {
                            country: 'invalid-country',
                            language: 'en',
                        },
                    ],
                },
            },
        };
        // When/Then - creating a NodeConfigAdapter should throw a ZodError
        expect(() => new NodeConfigAdapter(invalidConfig)).toThrow(ZodError);
    });

    test('should fail with invalid language in story digest task', () => {
        // Given - a configuration with invalid language
        const invalidConfig = {
            ...validConfig,
            inbound: {
                ...validConfig.inbound,
                tasks: {
                    storyDigest: [
                        {
                            country: 'us',
                            language: 'invalid-language',
                        },
                    ],
                },
            },
        };
        // When/Then - creating a NodeConfigAdapter should throw a ZodError
        expect(() => new NodeConfigAdapter(invalidConfig)).toThrow(ZodError);
    });
});
