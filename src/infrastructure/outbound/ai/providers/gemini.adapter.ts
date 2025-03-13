import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

import { type ConfigurationPort } from '../../../../application/ports/inbound/configuration.port.js';

import {
    type AIModelConfig,
    type AIProviderPort,
} from '../../../../application/ports/outbound/ai/provider.port.js';
import { type LoggerPort } from '../../../../application/ports/outbound/logging/logger.port.js';

import { ResponseParser, ResponseParsingError } from './response-parser.js';

type Dependencies = {
    config: ConfigurationPort;
    logger: LoggerPort;
    maxAttempts?: number;
};

export class GeminiAdapter implements AIProviderPort {
    private readonly client: GoogleGenerativeAI;
    private readonly logger: LoggerPort;
    private readonly maxAttempts: number;

    constructor({ config, logger, maxAttempts = 1 }: Dependencies) {
        this.client = new GoogleGenerativeAI(config.getApiConfiguration().gemini.apiKey);
        this.logger = logger;
        this.maxAttempts = maxAttempts;
    }

    public async generateContent<T>(
        prompt: string,
        schema: z.ZodSchema<T>,
        config?: AIModelConfig,
    ): Promise<T> {
        let lastError: Error | undefined;
        let attempts = 0;

        while (attempts < this.maxAttempts) {
            try {
                attempts++;
                const model = this.client.getGenerativeModel({
                    model: config?.model ?? 'gemini-1.5-pro',
                });

                const result = await model.generateContent(prompt);
                const text = result.response.text();
                if (!text) {
                    throw new Error('Empty response from Gemini');
                }

                return ResponseParser.parse(text, schema);
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                // Check if we should retry based on error type
                if (!this.shouldRetry(attempts, lastError)) {
                    this.logger.error('Failed to generate content with Gemini after all retries', {
                        attempts,
                        error: lastError,
                        prompt,
                    });
                    throw lastError;
                }

                // Log retry attempt
                this.logger.warn('Retrying Gemini content generation', {
                    attempt: attempts,
                    error: lastError,
                    maxAttempts: this.maxAttempts,
                    prompt,
                });
            }
        }

        // This should never be reached due to the throw in the catch block,
        // but TypeScript needs it for type safety
        throw lastError ?? new Error('Failed to generate content with Gemini');
    }

    private shouldRetry(attempts: number, error: Error): boolean {
        return attempts < this.maxAttempts && error instanceof ResponseParsingError;
    }
}
