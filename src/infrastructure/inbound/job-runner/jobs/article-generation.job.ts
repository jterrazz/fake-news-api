import { type LoggerPort } from '@jterrazz/logger';

import { type JobPort } from '../../../../application/ports/inbound/job-runner.port.js';
import { type GenerateArticlesUseCase } from '../../../../application/use-cases/articles/generate-articles.use-case.js';

import { Country } from '../../../../domain/value-objects/country.vo.js';
import { Language } from '../../../../domain/value-objects/language.vo.js';

export class ArticleGenerationJob {
    constructor(
        private readonly generateArticlesUseCase: GenerateArticlesUseCase,
        private readonly logger: LoggerPort,
    ) {}

    async process(_job: JobPort): Promise<void> {
        this.logger.info('Starting article generation job');

        const languages = [
            { country: new Country('fr'), language: new Language('en') },
            { country: new Country('us'), language: new Language('fr') },
        ];

        for (const { country, language } of languages) {
            await this.generateArticlesUseCase.execute(language, country);
        }

        this.logger.info('Article generation job completed');
    }
}
