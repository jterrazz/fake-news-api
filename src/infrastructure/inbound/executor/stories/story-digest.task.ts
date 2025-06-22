import { type LoggerPort } from '@jterrazz/logger';

import { type StoryDigestTaskConfig } from '../../../../application/ports/inbound/configuration.port.js';

import { type TaskPort } from '../../../../application/ports/inbound/executor.port.js';
import { type DigestStoriesUseCase } from '../../../../application/use-cases/stories/digest-stories.use-case.js';

import { Country } from '../../../../domain/value-objects/country.vo.js';
import { Language } from '../../../../domain/value-objects/language.vo.js';

export class StoryDigestTask implements TaskPort {
    public readonly executeOnStartup = true;
    public readonly name = 'story-digest';
    public readonly schedule = '0 */2 * * *'; // Every 2 hours

    constructor(
        private readonly digestStories: DigestStoriesUseCase,
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

            await Promise.all(
                languages.map(async ({ country, language }) => {
                    this.logger.info('Digesting stories', {
                        country: country.toString(),
                        language: language.toString(),
                    });
                    return this.digestStories.execute(language, country);
                }),
            );

            this.logger.info('Story digest task completed successfully');
        } catch (error) {
            this.logger.error('Story digest task failed', { error });
            throw error;
        }
    }
}
