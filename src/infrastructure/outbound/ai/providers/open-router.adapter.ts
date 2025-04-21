import { type LoggerPort } from '@jterrazz/logger';
import OpenAI from 'openai';

import { type AIPrompt } from '../../../../application/ports/outbound/ai/prompt.port.js';
import {
    type AIModelConfig,
    type AIProviderPort,
} from '../../../../application/ports/outbound/ai/provider.port.js';

import type { MonitoringPort } from '../../monitoring/monitoring.port.js';

import { ResponseParser, ResponseParsingError } from './response-parser.js';

type OpenRouterModel = 'deepseek/deepseek-r1:free' | 'openai/o4-mini' | 'openai/o4-mini-high';

/**
 * Adapter for OpenRouter's API service implementing the AIProviderPort interface.
 * Handles content generation with automatic retries for parsing errors.
 */
export class OpenRouterAdapter implements AIProviderPort {
    private readonly client: OpenAI;
    private readonly maxAttempts: number = 3;

    constructor(
        private readonly logger: LoggerPort,
        private readonly monitoring: MonitoringPort,
        private readonly config: {
            apiKey: string;
            budget: 'free' | 'paid';
        },
    ) {
        this.client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: 'https://openrouter.ai/api/v1',
            defaultHeaders: {
                'X-Title': 'Fake News',
            },
        });
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

        return this.monitoring.monitorSegment('Ai/OpenRouter/Generate', async () => {
            return this.executeWithRetries(async () => {
                const response = await this.generateModelResponse(modelType, prompt.query);
                return ResponseParser.parse(response, prompt.responseSchema);
            });
        });
    }

    private async executeWithRetries<T>(operation: () => Promise<T>): Promise<T> {
        let lastError: Error | undefined;
        let attempts = 0;

        this.logFirstAttempt();
        while (attempts < this.maxAttempts) {
            try {
                attempts++;
                return await operation();
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                if (!this.shouldRetry(attempts, lastError)) {
                    this.logError(lastError, attempts);
                    this.monitoring.recordCount('OpenRouter', 'Errors');
                    throw lastError;
                }

                this.logRetryAttempt(lastError, attempts);
                this.monitoring.recordCount('OpenRouter', 'Retries');
            }
        }

        throw lastError ?? new Error('Failed to generate content with OpenRouter');
    }

    private async generateModelResponse(model: OpenRouterModel, prompt: string): Promise<string> {
        return this.monitoring.monitorSegment('Ai/OpenRouter/Request', async () => {
            const completion = await this.client.chat.completions.create({
                messages: [{ content: prompt, role: 'user' }],
                model,
            });

            if (!completion) {
                this.monitoring.recordCount('OpenRouter', 'Errors/NoResponse');
                throw new Error('No response received from OpenRouter');
            }

            if (
                !completion.choices ||
                !Array.isArray(completion.choices) ||
                completion.choices.length === 0
            ) {
                this.monitoring.recordCount('OpenRouter', 'Errors/NoChoices');
                this.logger.error('Invalid response format from OpenRouter', { completion });
                throw new Error('Invalid response format from OpenRouter: No choices array');
            }

            const firstChoice = completion.choices[0];
            if (!firstChoice || !firstChoice.message) {
                this.monitoring.recordCount('OpenRouter', 'Errors/InvalidChoice');
                this.logger.error('Invalid choice format from OpenRouter', { firstChoice });
                throw new Error('Invalid choice format from OpenRouter');
            }

            const text = firstChoice.message.content;
            if (!text) {
                this.monitoring.recordCount('OpenRouter', 'Errors/EmptyResponse');
                throw new Error('Empty response content from OpenRouter');
            }

            return text;
        });
    }

    private getModelType(capability: AIModelConfig['capability']): OpenRouterModel {
        if (this.config.budget === 'free') {
            return 'deepseek/deepseek-r1:free';
        }

        return capability === 'basic' ? 'openai/o4-mini' : 'openai/o4-mini-high';
    }

    private logError(error: Error, attempts: number): void {
        this.logger.error('Failed to generate content with OpenRouter after all retries', {
            attempts,
            error,
        });
    }

    private logFirstAttempt(): void {
        this.logger.info('Generating content with OpenRouter', {
            maxAttempts: this.maxAttempts,
        });
    }

    private logRetryAttempt(error: Error, attempt: number): void {
        this.logger.warn('Retrying OpenRouter content generation', {
            attempt,
            error,
            maxAttempts: this.maxAttempts,
        });
    }

    private shouldRetry(attempts: number, error: Error): boolean {
        return attempts < this.maxAttempts && error instanceof ResponseParsingError;
    }
}
