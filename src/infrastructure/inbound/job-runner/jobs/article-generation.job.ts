import { type LoggerPort } from '@jterrazz/logger';
import type { Job } from 'bullmq';

import { type GenerateArticlesUseCase } from '../../../../application/use-cases/articles/generate-articles.use-case.js';

import { Country } from '../../../../domain/value-objects/country.vo.js';
import { Language } from '../../../../domain/value-objects/language.vo.js';

export class ArticleGenerationJob {
    constructor(
        private readonly generateArticlesUseCase: GenerateArticlesUseCase,
        private readonly logger: LoggerPort,
    ) {}

    async process(_job: Job): Promise<void> {
        this.logger.info('Starting article generation job');

        const languages = [
            { country: Country.create('us'), language: Language.create('en') },
            { country: Country.create('fr'), language: Language.create('fr') },
        ];

        for (const { country, language } of languages) {
            await this.generateArticlesUseCase.execute(language, country);
        }

        this.logger.info('Article generation job completed');
    }
}
