import { type ArticleGeneratorPort, type GenerateArticlesParams } from '../../../application/ports/outbound/ai/article-generator.port.js';
import { type AIProviderPort } from '../../../application/ports/outbound/ai/provider.port.js';
import { type LoggerPort } from '../../../application/ports/outbound/logging/logger.port.js';

import { type Article } from '../../../domain/entities/article.js';

import { ArticleGenerationPrompt } from './prompts/article-generation.prompt.js';

type Dependencies = {
    aiProvider: AIProviderPort;
    logger: LoggerPort;
};

export class AIArticleGenerator implements ArticleGeneratorPort {
    constructor(private readonly deps: Dependencies) {}

    public async generateArticles(params: GenerateArticlesParams): Promise<Article[]> {
        const { aiProvider, logger } = this.deps;

        try {
            // Generate prompt from template
            const prompt = ArticleGenerationPrompt.generate(params);

            // Get raw articles from AI
            const rawArticles = await aiProvider.generateContent(
                prompt,
                ArticleGenerationPrompt.responseSchema,
                { model: 'gemini-1.5-pro' },
            );

            // Base date from current time
            const baseDate = new Date();

            // Shuffle articles to randomize real/fake order
            const shuffledArticles = [...rawArticles].sort(() => Math.random() - 0.5);

            // Add metadata to each article
            const articles = shuffledArticles.map((article, index) => {
                const uniqueDate = new Date(baseDate);
                // Add index * 1 second to ensure unique timestamps
                uniqueDate.setSeconds(uniqueDate.getSeconds() + index);

                return {
                    ...article,
                    country: params.sourceCountry,
                    createdAt: uniqueDate,
                    id: crypto.randomUUID(),
                    language: params.language,
                };
            });

            // Log generation stats for monitoring
            const realCount = articles.filter((a) => !a.isFake).length;
            const fakeCount = articles.filter((a) => a.isFake).length;
            logger.info('Generated articles', {
                articleCount: articles.length,
                fakeCount,
                language: params.language,
                realCount,
                sourceCountry: params.sourceCountry,
            });

            return articles;
        } catch (error) {
            logger.error('Failed to generate articles', {
                error,
                language: params.language,
                sourceCountry: params.sourceCountry,
            });
            throw error;
        }
    }
} 