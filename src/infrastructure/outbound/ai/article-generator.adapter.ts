import {
    type ArticleGeneratorPort,
    type GenerateArticlesParams,
} from '../../../application/ports/outbound/ai/article-generator.port.js';
import { type AIProviderPort } from '../../../application/ports/outbound/ai/provider.port.js';
import { type LoggerPort } from '../../../application/ports/outbound/logging/logger.port.js';

import { Article } from '../../../domain/entities/article.js';

import { ArticleGeneratorPrompt } from './prompts/article-generator.prompt.js';

type Dependencies = {
    aiProvider: AIProviderPort;
    logger: LoggerPort;
};

/**
 * Shuffles an array using a cryptographically secure random number generator
 */
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(
            (crypto.getRandomValues(new Uint32Array(1))[0] / (0xffffffff + 1)) * (i + 1),
        );
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export class AIArticleGenerator implements ArticleGeneratorPort {
    private readonly prompt: ArticleGeneratorPrompt;

    constructor(private readonly deps: Dependencies) {
        this.prompt = new ArticleGeneratorPrompt();
    }

    public async generateArticles(params: GenerateArticlesParams): Promise<Article[]> {
        const { aiProvider, logger } = this.deps;

        try {
            logger.info('Starting article generation with AI', {
                count: params.count,
                country: params.country,
                language: params.language,
            });

            // Generate instructions
            const instructions = this.prompt.generateInstructions(params);

            // Get raw articles from AI
            let rawArticles = await aiProvider.generateContent(
                instructions,
                this.prompt.answerSchema,
                { capability: 'advanced' },
            );

            // Ensure we have exactly the requested number of articles
            if (rawArticles.length > params.count) {
                rawArticles = rawArticles.slice(0, params.count);
            } else if (rawArticles.length < params.count) {
                logger.warn('AI generated fewer articles than requested', {
                    country: params.country,
                    expected: params.count,
                    language: params.language,
                    received: rawArticles.length,
                });
            }

            // Base date from current time
            const baseDate = new Date();

            // Shuffle articles to randomize real/fake order
            const shuffledArticles = shuffleArray(rawArticles);

            // Add metadata to each article
            const articles = shuffledArticles.map((article, index) => {
                const uniqueDate = new Date(baseDate);
                // Add index * 1 second to ensure unique timestamps
                uniqueDate.setSeconds(uniqueDate.getSeconds() + index);

                return Article.create({
                    ...article,
                    country: params.country,
                    createdAt: uniqueDate,
                    id: crypto.randomUUID(),
                    language: params.language,
                });
            });

            // Log generation stats for monitoring
            const realCount = articles.filter((a) => !a.isFake()).length;
            const fakeCount = articles.filter((a) => a.isFake()).length;
            logger.info('Generated articles with AI', {
                articleCount: articles.length,
                country: params.country,
                expected: params.count,
                fakeCount,
                language: params.language,
                realCount,
            });

            return articles;
        } catch (error) {
            logger.error('Failed to generate articles with AI', {
                country: params.country,
                error,
                language: params.language,
            });
            throw error;
        }
    }
}
