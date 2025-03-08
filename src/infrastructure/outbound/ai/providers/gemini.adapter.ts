import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

import { type ConfigurationPort } from '../../../../application/ports/inbound/configuration.port.js';

import {
    type AIModelConfig,
    type AIProviderPort,
} from '../../../../application/ports/outbound/ai/provider.port.js';
import { type LoggerPort } from '../../../../application/ports/outbound/logging/logger.port.js';

type Dependencies = {
    config: ConfigurationPort;
    logger: LoggerPort;
};

export class GeminiAdapter implements AIProviderPort {
    private readonly client: GoogleGenerativeAI;
    private readonly logger: LoggerPort;

    constructor({ config, logger }: Dependencies) {
        this.client = new GoogleGenerativeAI(config.getApiConfiguration().gemini.apiKey);
        this.logger = logger;
    }

    public async generateContent<T>(
        prompt: string,
        schema: z.ZodSchema<T>,
        config?: AIModelConfig,
    ): Promise<T> {
        try {
            const model = this.client.getGenerativeModel({
                model: config?.model ?? 'gemini-1.5-pro',
            });

            const result = await model.generateContent(prompt);
            const text = result.response.text();
            if (!text) {
                throw new Error('Empty response from Gemini');
            }

            // Extract JSON from response (in case there's any text before/after)
            const json = text.slice(text.indexOf('['), text.lastIndexOf(']') + 1);
            return schema.parse(JSON.parse(json));
        } catch (error) {
            this.logger.error('Failed to generate content with Gemini', { error, prompt });
            throw error;
        }
    }
}
