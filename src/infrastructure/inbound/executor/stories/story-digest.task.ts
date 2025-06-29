import { type LoggerPort } from '@jterrazz/logger';

import { type StoryDigestTaskConfig } from '../../../../application/ports/inbound/configuration.port.js';

import { type TaskPort } from '../../../../application/ports/inbound/executor.port.js';
import { type CurateArticlesUseCase } from '../../../../application/use-cases/articles/curate-articles.use-case.js';
import { type GenerateArticlesFromStoriesUseCase } from '../../../../application/use-cases/articles/generate-articles-from-stories.use-case.js';
import { type DigestStoriesUseCase } from '../../../../application/use-cases/stories/digest-stories.use-case.js';

import { Country } from '../../../../domain/value-objects/country.vo.js';
import { Language } from '../../../../domain/value-objects/language.vo.js';

export class StoryDigestTask implements TaskPort {
    public readonly executeOnStartup = true;
    public readonly name = 'story-digest';
    public readonly schedule = '0 */2 * * *'; // Every 2 hours

    constructor(
        private readonly digestStories: DigestStoriesUseCase,
        private readonly generateArticlesFromStories: GenerateArticlesFromStoriesUseCase,
        private readonly curateArticles: CurateArticlesUseCase,
        private readonly taskConfigs: StoryDigestTaskConfig[],
        private readonly logger: LoggerPort,
    ) {}

    async execute(): Promise<void> {
        this.logger.info('Starting story digest task');

        try {
            this.logger.info('Story digest configurations loaded', {
                taskCount: this.taskConfigs.length,
                tasks: this.taskConfigs,
            });

            const languages = this.taskConfigs.map((config) => ({
                country: new Country(config.country),
                language: new Language(config.language),
            }));

            // Step 1: Digest stories
            await Promise.all(
                languages.map(async ({ country, language }) => {
                    this.logger.info('Digesting stories', {
                        country: country.toString(),
                        language: language.toString(),
                    });
                    return this.digestStories.execute(language, country);
                }),
            );

            this.logger.info('Story digest completed, starting article generation');

            // Step 2: Generate articles from stories that don't have articles yet
            await Promise.all(
                languages.map(async ({ country, language }) => {
                    this.logger.info('Generating articles from stories', {
                        country: country.toString(),
                        language: language.toString(),
                    });
                    return this.generateArticlesFromStories.execute(language, country);
                }),
            );

            this.logger.info('Article generation completed, starting article curation');

            // Step 3: Curate newly generated articles
            await this.curateArticles.execute();

            this.logger.info(
                'Story digest, article generation, and curation task completed successfully',
            );
        } catch (error) {
            this.logger.error('Story digest task failed', { error });
            throw error;
        }
    }
}
