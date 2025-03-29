import OpenAI from 'openai';

import { type ConfigurationPort } from '../../../../application/ports/inbound/configuration.port.js';

import { AIPrompt } from '../../../../application/ports/outbound/ai/prompt.port.js';
import {
    type AIModelConfig,
    type AIProviderPort,
} from '../../../../application/ports/outbound/ai/provider.port.js';
import { type LoggerPort } from '../../../../application/ports/outbound/logging/logger.port.js';

import { ResponseParser, ResponseParsingError } from './response-parser.js';

type OpenRouterAdapterConfig = {
    config: ConfigurationPort;
    logger: LoggerPort;
    maxAttempts?: number;
};

type OpenRouterModelType = 'deepseek/deepseek-chat' | 'deepseek/deepseek-r1';

/**
 * Adapter for OpenRouter's API service implementing the AIProviderPort interface.
 * Handles content generation with automatic retries for parsing errors.
 */
export class OpenRouterAdapter implements AIProviderPort {
    private readonly client: OpenAI;
    private readonly logger: LoggerPort;
    private readonly maxAttempts: number;

    constructor({ config, logger, maxAttempts = 3 }: OpenRouterAdapterConfig) {
        this.client = new OpenAI({
            apiKey: config.getApiConfiguration().openRouter.apiKey,
            baseURL: 'https://openrouter.ai/api/v1',
            defaultHeaders: {
                'X-Title': 'Fake News',
            },
        });
        this.logger = logger;
        this.maxAttempts = maxAttempts;
    }

    /**
     * Generates content using OpenRouter with automatic retries for parsing errors.
     *
     * @param prompt - The request to send to OpenRouter
     * @param config - Optional AI model configuration
     * @returns Parsed and validated response of type T
     * @throws {Error} If content generation or parsing fails after all retries
     */
    public async generateContent<T>(
        prompt: AIPrompt<T>,
        config: AIModelConfig = { capability: 'basic' },
    ): Promise<T> {
        const modelType = this.getModelType(config.capability);

        return this.executeWithRetries(async () => {
            const response = await this.generateModelResponse(modelType, prompt.query);
            return ResponseParser.parse(response, prompt.responseSchema);
        });
    }

    private getModelType(capability: AIModelConfig['capability']): OpenRouterModelType {
        return capability === 'basic' ? 'deepseek/deepseek-chat' : 'deepseek/deepseek-r1';
    }

    private async generateModelResponse(
        model: OpenRouterModelType,
        prompt: string,
    ): Promise<string> {
        const completion = await this.client.chat.completions.create({
            messages: [{ content: prompt, role: 'user' }],
            model,
        });

        const text = completion.choices[0]?.message?.content;

        if (!text) {
            throw new Error('Empty response from OpenRouter');
        }

        return text;
    }

    private async executeWithRetries<T>(operation: () => Promise<T>): Promise<T> {
        let lastError: Error | undefined;
        let attempts = 0;

        while (attempts < this.maxAttempts) {
            try {
                this.logger.info('Executing operation with OpenRouter', {
                    attempts,
                    maxAttempts: this.maxAttempts,
                });
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

        throw lastError ?? new Error('Failed to generate content with OpenRouter');
    }

    private shouldRetry(attempts: number, error: Error): boolean {
        return attempts < this.maxAttempts && error instanceof ResponseParsingError;
    }

    private logError(error: Error, attempts: number): void {
        this.logger.error('Failed to generate content with OpenRouter after all retries', {
            attempts,
            error,
        });
    }

    private logRetryAttempt(error: Error, attempt: number): void {
        this.logger.warn('Retrying OpenRouter content generation', {
            attempt,
            error,
            maxAttempts: this.maxAttempts,
        });
    }
}
