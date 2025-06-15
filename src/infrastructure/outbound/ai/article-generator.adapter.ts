import { type LoggerPort } from '@jterrazz/logger';

import {
    type ArticleGenerationParams,
    type ArticleGeneratorPort,
} from '../../../application/ports/outbound/ai/article-generator.port.js';
import { type AIProviderPort } from '../../../application/ports/outbound/ai/provider.port.js';

import { Article } from '../../../domain/entities/article.entity.js';

import { ArticlePromptGenerator } from './prompts/article-prompt.generator.js';

export class AIArticleGenerator implements ArticleGeneratorPort {
    private readonly promptGenerator: ArticlePromptGenerator;

    constructor(
        private readonly aiProvider: AIProviderPort,
        private readonly logger: LoggerPort,
    ) {
        this.promptGenerator = new ArticlePromptGenerator();
    }

    public async generateArticles(params: ArticleGenerationParams): Promise<Article[]> {
        try {
            this.logger.info('Generating articles with AI', {
                count: params.count,
                country: params.country.toString(),
                language: params.language.toString(),
            });

            const prompt = this.promptGenerator.generatePrompt(params);

            // Get raw articles from AI
            let rawArticles = await this.aiProvider.generateContent(prompt);

            // Ensure we have exactly the requested number of articles
            if (rawArticles.length > params.count) {
                rawArticles = rawArticles.slice(0, params.count);
            } else if (rawArticles.length < params.count) {
                this.logger.warn('AI generated fewer articles than requested', {
                    country: params.country.toString(),
                    expected: params.count,
                    language: params.language.toString(),
                    received: rawArticles.length,
                });
            }

            // Base date from current time
            const baseDate = new Date();

            // Add metadata to each article
            const articles = rawArticles.map((article, index) => {
                const uniqueDate = new Date(baseDate);
                // Add index * 1 second to ensure unique timestamps
                uniqueDate.setSeconds(uniqueDate.getSeconds() - index);

                return new Article({
                    ...article,
                    country: params.country,
                    id: crypto.randomUUID(),
                    language: params.language,
                    publishedAt: uniqueDate,
                });
            });

            // Log generation stats for monitoring
            const realCount = articles.filter((a) => !a.isFake()).length;
            const fakeCount = articles.filter((a) => a.isFake()).length;
            this.logger.info('Generated articles with AI', {
                articleCount: articles.length,
                country: params.country.toString(),
                expected: params.count,
                fakeCount,
                language: params.language.toString(),
                realCount,
            });

            return articles;
        } catch (error) {
            this.logger.error('Failed to generate articles with AI', {
                country: params.country.toString(),
                error,
                language: params.language.toString(),
            });
            throw error;
        }
    }
}
