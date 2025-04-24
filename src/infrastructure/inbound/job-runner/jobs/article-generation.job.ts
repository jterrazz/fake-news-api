import { type MonitoringPort } from '@jterrazz/monitoring';

import { type Job } from '../../../../application/ports/inbound/job-runner.port.js';
import { type GenerateArticlesUseCase } from '../../../../application/use-cases/articles/generate-articles.use-case.js';

import { ArticleCountry } from '../../../../domain/value-objects/article-country.vo.js';
import { ArticleLanguage } from '../../../../domain/value-objects/article-language.vo.js';

type Dependencies = {
    generateArticles: GenerateArticlesUseCase;
    monitoring: MonitoringPort;
};

/**
 * Creates the article generation job with its dependencies
 */
export const createArticleGenerationJob = ({
    generateArticles,
    monitoring,
}: Dependencies): Job => ({
    execute: async () => {
        return monitoring.monitorTransaction('Jobs', 'ArticleGeneration', async () => {
            try {
                await Promise.all([
                    generateArticles.execute(
                        ArticleLanguage.create('en'),
                        ArticleCountry.create('us'),
                    ),
                    generateArticles.execute(
                        ArticleLanguage.create('fr'),
                        ArticleCountry.create('fr'),
                    ),
                ]);
                monitoring.recordCount('Jobs', 'ArticleGeneration/Success');
            } catch (error) {
                monitoring.recordCount('Jobs', 'ArticleGeneration/Error');
                throw error;
            }
        });
    },
    executeOnStartup: true,
    name: 'article-generation',
    schedule: '5 * * * *', // Run at 5 minutes past every hour
});
