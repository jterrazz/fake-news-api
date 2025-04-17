import { AIPrompt } from './prompt.port.js';

/**
 * Configuration for AI model
 */
export type AIModelConfig = {
    capability: 'advanced' | 'basic';
};

/**
 * Port for AI provider services
 */
export interface AIProviderPort {
    /**
     * Generate content and validate it against a schema
     * @param prompt The request to send to the AI
     * @param config Optional model configuration
     */
    generateContent<T>(prompt: AIPrompt<T>, config?: AIModelConfig): Promise<T>;
}
