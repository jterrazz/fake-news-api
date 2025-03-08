import { ZodError } from 'zod';

import { ConfigurationService } from '../configuration.service.js';

describe('Configuration Service', () => {
    const validConfig = {
        api: {
            gemini: { apiKey: 'test-gemini-key' },
            worldNews: { apiKey: 'test-world-news-key' },
        },
        app: {
            env: 'development',
            port: 3000,
        },
    };

    it('should load valid configuration', () => {
        const configService = new ConfigurationService(validConfig);
        const config = configService.getConfiguration();

        expect(config).toEqual(validConfig);
        expect(configService.getApiConfiguration()).toEqual(validConfig.api);
        expect(configService.getAppConfiguration()).toEqual(validConfig.app);
    });

    it('should fail with invalid environment', () => {
        const invalidConfig = {
            ...validConfig,
            app: {
                ...validConfig.app,
                env: 'invalid-env',
            },
        };

        expect(() => new ConfigurationService(invalidConfig)).toThrow(ZodError);
    });

    it('should fail with missing API keys', () => {
        const invalidConfig = {
            ...validConfig,
            api: {
                gemini: { apiKey: '' },
                worldNews: { apiKey: '' },
            },
        };

        expect(() => new ConfigurationService(invalidConfig)).toThrow(ZodError);
    });

    it('should fail with invalid port', () => {
        const invalidConfig = {
            ...validConfig,
            app: {
                ...validConfig.app,
                port: '3000', // Port should be number, not string
            },
        };

        expect(() => new ConfigurationService(invalidConfig)).toThrow(ZodError);
    });

    it('should fail with missing required fields', () => {
        const invalidConfig = {
            app: {
                env: 'development',
            },
        };

        expect(() => new ConfigurationService(invalidConfig)).toThrow(ZodError);
    });
});
