import { z } from 'zod';

/**
 * Configuration for AI model
 */
export type AIModelConfig = {
    model: string;
    temperature?: number;
    maxTokens?: number;
};

/**
 * Port for AI provider services
 */
export interface AIProviderPort {
    /**
     * Generate content and validate it against a schema
     * @param prompt The prompt to send to the AI
     * @param schema Zod schema to validate the response
     * @param config Optional model configuration
     */
    generateContent<T>(prompt: string, schema: z.ZodSchema<T>, config?: AIModelConfig): Promise<T>;
}
