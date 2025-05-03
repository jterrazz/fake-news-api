import { type z } from 'zod';

/**
 * Prompt for AI content generation
 * Only supports an array of messages (OpenAI-style)
 */
export type AIPrompt<T> = {
    messages: Message[];
    responseSchema: z.ZodSchema<T>;
};

/**
 * Base interface for all AI content generators
 */
export interface AIPromptGenerator<TInput, TOutput> {
    generatePrompt(params: TInput): AIPrompt<TOutput>;
}

/**
 * OpenAI-style message for chat completion
 * Optionally supports a 'cache' property for system prompt caching (OpenRouter extension)
 */
export interface Message {
    cache?: boolean;
    content: string;
    role: 'assistant' | 'system' | 'user';
}
