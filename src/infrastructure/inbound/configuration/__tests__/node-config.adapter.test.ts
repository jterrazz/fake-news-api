import { ZodError } from 'zod';

import { NodeConfigAdapter } from '../node-config.adapter.js';

describe('Node Config Adapter', () => {
    const validConfig = {
        api: {
            worldNews: {
                apiKey: 'test-world-news-key',
                useCache: false,
            },
        },
        app: {
            env: 'development',
            host: 'localhost',
            port: 3000,
        },
        logging: {
            level: 'info',
        },
    };

    it('should load valid configuration', () => {
        const configAdapter = new NodeConfigAdapter(validConfig);

        expect(configAdapter.getApiConfiguration()).toEqual(validConfig.api);
        expect(configAdapter.getAppConfiguration()).toEqual({
            ...validConfig.app,
            logging: validConfig.logging,
        });
    });

    it('should fail with invalid environment', () => {
        const invalidConfig = {
            ...validConfig,
            app: {
                ...validConfig.app,
                env: 'invalid-env',
            },
        };

        expect(() => new NodeConfigAdapter(invalidConfig)).toThrow(ZodError);
    });

    it('should fail with missing API keys', () => {
        const invalidConfig = {
            ...validConfig,
            api: {
                worldNews: { apiKey: '' },
            },
        };

        expect(() => new NodeConfigAdapter(invalidConfig)).toThrow(ZodError);
    });

    it('should fail with invalid port', () => {
        const invalidConfig = {
            ...validConfig,
            app: {
                ...validConfig.app,
                port: 'invalid-port',
            },
        };

        expect(() => new NodeConfigAdapter(invalidConfig)).toThrow(ZodError);
    });

    it('should fail with invalid log level', () => {
        const invalidConfig = {
            ...validConfig,
            logging: {
                level: 'invalid-level',
            },
        };

        expect(() => new NodeConfigAdapter(invalidConfig)).toThrow(ZodError);
    });

    it('should fail with missing host', () => {
        const invalidConfig = {
            ...validConfig,
            app: {
                env: 'development',
                port: 3000,
            },
        };

        expect(() => new NodeConfigAdapter(invalidConfig)).toThrow(ZodError);
    });
});
