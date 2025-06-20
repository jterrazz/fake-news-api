import { type LoggerPort } from '@jterrazz/logger';

import { type TaskPort } from '../../../../application/ports/inbound/executor.port.js';
import { type GenerateArticlesUseCase } from '../../../../application/use-cases/articles/generate-articles.use-case.js';

import { Country } from '../../../../domain/value-objects/country.vo.js';
import { Language } from '../../../../domain/value-objects/language.vo.js';

export class ArticleGenerationTask implements TaskPort {
    public readonly executeOnStartup = true;
    public readonly name = 'article-generation';
    public readonly schedule = '0 */1 * * *'; // Every 1 hours

    constructor(
        private readonly generateArticles: GenerateArticlesUseCase,
        private readonly logger: LoggerPort,
    ) {}

    async execute(): Promise<void> {
        this.logger.info('Starting article generation task');

        try {
            const languages = [
                { country: new Country('fr'), language: new Language('fr') },
                { country: new Country('us'), language: new Language('en') },
            ];

            await Promise.all(
                languages.map(async ({ country, language }) =>
                    this.generateArticles.execute(language, country),
                ),
            );

            this.logger.info('Article generation task completed successfully');
        } catch (error) {
            this.logger.error('Article generation task failed', { error });
            throw error;
        }
    }
}
