import { type LoggerPort } from '@jterrazz/logger';
import { type MonitoringPort } from '@jterrazz/monitoring';
import { createOpenRouter, type OpenRouterProvider } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';

import { type AIPrompt } from '../../../../application/ports/outbound/ai/prompt.port.js';
import {
    type AIModelConfig,
    type AIProviderPort,
} from '../../../../application/ports/outbound/ai/provider.port.js';

import { ResponseParser, ResponseParsingError } from './response-parser.js';

/**
 * Adapter for OpenRouter's API service implementing the AIProviderPort interface.
 * Handles content generation with automatic retries for parsing errors.
 */
export class OpenRouterAdapter implements AIProviderPort {
    private readonly maxAttempts: number = 3;
    private readonly openRouterProvider: OpenRouterProvider;

    constructor(
        private readonly logger: LoggerPort,
        private readonly monitoring: MonitoringPort,
        private readonly config: {
            apiKey: string;
            budget: 'free' | 'paid';
        },
    ) {
        this.openRouterProvider = createOpenRouter({
            apiKey: config.apiKey,
            headers: {
                'HTTP-Referer': 'https://jterrazz.com',
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
        config: AIModelConfig = { capability: 'reasoning' },
    ): Promise<T> {
        const model = this.getModel(config.capability);

        this.logFirstAttempt(model);
        return this.monitoring.monitorSegment('Ai/OpenRouter/Generate', async () => {
            return this.executeWithRetries(async () => {
                const response = await this.generateModelResponse(model, prompt);
                return ResponseParser.parse(response, prompt.responseSchema);
            });
        });
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
                    this.monitoring.recordCount('OpenRouter', 'Errors');
                    throw lastError;
                }

                await new Promise((resolve) => setTimeout(resolve, 10_000));
                this.logRetryAttempt(lastError, attempts);
                this.monitoring.recordCount('OpenRouter', 'Retries');
            }
        }

        throw lastError ?? new Error('Failed to generate content with OpenRouter');
    }

    private async generateModelResponse<T>(model: string, prompt: AIPrompt<T>): Promise<string> {
        return this.monitoring.monitorSegment('Ai/OpenRouter/Request', async () => {
            // Prepare model instance
            const modelInstance = this.openRouterProvider(model);
            // Prepare messages, passing providerMetadata for cache control if present
            const messages = prompt.messages.map((msg) => {
                if (msg.role === 'system' && 'cache' in msg && msg.cache) {
                    return {
                        ...msg,
                        providerMetadata: {
                            openrouter: {
                                cacheControl: { type: 'ephemeral' },
                            },
                        },
                    };
                }
                return msg;
            });
            const { text } = await generateText({
                messages,
                model: modelInstance,
            });
            if (!text) {
                this.monitoring.recordCount('OpenRouter', 'Errors/EmptyResponse');
                throw new Error('Empty response content from OpenRouter');
            }
            return text;
        });
    }

    private getModel(capability: AIModelConfig['capability']): string {
        if (this.config.budget === 'free') {
            return 'x-ai/grok-3-beta'; //'deepseek/deepseek-r1:free';
        }

        return capability === 'reasoning' ? 'x-ai/grok-3-beta' : 'openai/o4-mini';
    }

    private logError(error: Error, attempts: number): void {
        this.logger.error('Failed to generate content with OpenRouter after all retries', {
            attempts,
            error,
        });
    }

    private logFirstAttempt(model: string): void {
        this.logger.info('Generating content with OpenRouter', {
            maxAttempts: this.maxAttempts,
            model,
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
