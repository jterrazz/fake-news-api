import { type z } from 'zod';

/**
 * Prompt for AI content generation
 */
export type AIPrompt<T> = {
    query: string;
    responseSchema: z.ZodSchema<T>;
};

/**
 * Base interface for all AI content generators
 */
export interface AIPromptGenerator<TInput, TOutput> {
    generatePrompt(params: TInput): AIPrompt<TOutput>;
}
