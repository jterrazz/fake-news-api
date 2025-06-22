import { type LoggerPort } from '@jterrazz/logger';

import { type ArticleGenerationTaskConfig } from '../../../../application/ports/inbound/configuration.port.js';

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
        private readonly taskConfigs: ArticleGenerationTaskConfig[],
        private readonly logger: LoggerPort,
    ) {}

    async execute(): Promise<void> {
        this.logger.info('Starting article generation task');

        try {
            this.logger.info('Article generation configurations loaded', {
                taskCount: this.taskConfigs.length,
                tasks: this.taskConfigs,
            });

            const languages = this.taskConfigs.map((config) => ({
                country: new Country(config.country),
                language: new Language(config.language),
            }));

            await Promise.all(
                languages.map(async ({ country, language }) => {
                    this.logger.info('Generating articles', {
                        country: country.toString(),
                        language: language.toString(),
                    });
                    return this.generateArticles.execute(language, country);
                }),
            );

            this.logger.info('Article generation task completed successfully');
        } catch (error) {
            this.logger.error('Article generation task failed', { error });
            throw error;
        }
    }
}
