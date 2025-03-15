import { type GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

import { type ConfigurationPort } from '../../../../application/ports/inbound/configuration.port.js';

import {
    type AIModelConfig,
    type AIProviderPort,
} from '../../../../application/ports/outbound/ai/provider.port.js';
import { type LoggerPort } from '../../../../application/ports/outbound/logging/logger.port.js';

import { ResponseParser, ResponseParsingError } from './response-parser.js';

type GeminiAdapterConfig = {
    config: ConfigurationPort;
    logger: LoggerPort;
    maxAttempts?: number;
};

type GeminiModelType = 'gemini-1.5-flash' | 'gemini-1.5-pro';

/**
 * Adapter for Google's Gemini AI service implementing the AIProviderPort interface.
 * Handles content generation with automatic retries for parsing errors.
 */
export class GeminiAdapter implements AIProviderPort {
    private readonly client: GoogleGenerativeAI;
    private readonly logger: LoggerPort;
    private readonly maxAttempts: number;

    constructor({ config, logger, maxAttempts = 1 }: GeminiAdapterConfig) {
        this.client = new GoogleGenerativeAI(config.getApiConfiguration().gemini.apiKey);
        this.logger = logger;
        this.maxAttempts = maxAttempts;
    }

    /**
     * Generates content using Gemini AI with automatic retries for parsing errors.
     *
     * @param prompt - The prompt to send to Gemini
     * @param schema - Zod schema for validating and parsing the response
     * @param config - Optional AI model configuration
     * @returns Parsed and validated response of type T
     * @throws {Error} If content generation or parsing fails after all retries
     */
    public async generateContent<T>(
        prompt: string,
        schema: z.ZodSchema<T>,
        config: AIModelConfig = { capability: 'basic' },
    ): Promise<T> {
        const modelType = this.getModelType(config.capability);
        const model = this.client.getGenerativeModel({ model: modelType });

        return this.executeWithRetries(async () => {
            const response = await this.generateModelResponse(model, prompt);
            return ResponseParser.parse(response, schema);
        });
    }

    private getModelType(capability: AIModelConfig['capability']): GeminiModelType {
        return capability === 'basic' ? 'gemini-1.5-flash' : 'gemini-1.5-pro';
    }

    private async generateModelResponse(model: GenerativeModel, prompt: string): Promise<string> {
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        if (!text) {
            throw new Error('Empty response from Gemini');
        }

        return text;
    }

    private async executeWithRetries<T>(operation: () => Promise<T>): Promise<T> {
        let lastError: Error | undefined;
        let attempts = 0;

        while (attempts < this.maxAttempts) {
            try {
                attempts++;
                return await operation();
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                if (!this.shouldRetry(attempts, lastError)) {
                    this.logError(lastError, attempts);
                    throw lastError;
                }

                this.logRetryAttempt(lastError, attempts);
            }
        }

        throw lastError ?? new Error('Failed to generate content with Gemini');
    }

    private shouldRetry(attempts: number, error: Error): boolean {
        return attempts < this.maxAttempts && error instanceof ResponseParsingError;
    }

    private logError(error: Error, attempts: number): void {
        this.logger.error('Failed to generate content with Gemini after all retries', {
            attempts,
            error,
        });
    }

    private logRetryAttempt(error: Error, attempt: number): void {
        this.logger.warn('Retrying Gemini content generation', {
            attempt,
            error,
            maxAttempts: this.maxAttempts,
        });
    }
}
