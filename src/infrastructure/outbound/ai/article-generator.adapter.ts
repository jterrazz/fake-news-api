import {
    AIResponseParser,
    BasicAgentAdapter,
    type ModelPort,
    SystemPromptAdapter,
    UserPromptAdapter,
} from '@jterrazz/intelligence';
import { type LoggerPort } from '@jterrazz/logger';

import {
    type ArticleGenerationParams,
    type ArticleGeneratorPort,
} from '../../../application/ports/outbound/ai/article-generator.port.js';

import { Article } from '../../../domain/entities/article.entity.js';

import { ArticlePromptGenerator } from './prompts/article-prompt.generator.js';

export class AIArticleGenerator implements ArticleGeneratorPort {
    private readonly promptGenerator: ArticlePromptGenerator;

    constructor(
        private readonly model: ModelPort,
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

            const { responseSchema, systemPrompt, userPrompt } =
                this.promptGenerator.generatePrompt(params);

            const agent = new BasicAgentAdapter('ArticleGenerator', {
                logger: this.logger,
                model: this.model,
                systemPrompt: new SystemPromptAdapter(systemPrompt),
            });

            // Get raw articles from AI
            const rawArticles = await agent.run(new UserPromptAdapter(userPrompt));

            if (!rawArticles) {
                throw new Error('No articles generated');
            }

            const parser = new AIResponseParser(responseSchema);
            let parsedArticles = parser.parse(rawArticles);

            // Ensure we have exactly the requested number of articles
            if (parsedArticles.length > params.count) {
                parsedArticles = parsedArticles.slice(0, params.count);
            } else if (parsedArticles.length < params.count) {
                this.logger.warn('AI generated fewer articles than requested', {
                    country: params.country.toString(),
                    expected: params.count,
                    language: params.language.toString(),
                    received: parsedArticles.length,
                });
            }

            // Base date from current time
            const baseDate = new Date();

            // Add metadata to each article
            const articles = parsedArticles.map((article, index) => {
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
