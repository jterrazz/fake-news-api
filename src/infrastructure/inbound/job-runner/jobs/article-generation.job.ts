import { type Job } from '../../../../application/ports/inbound/job-runner.port.js';
import { type GenerateArticlesUseCase } from '../../../../application/use-cases/articles/generate-articles.use-case.js';

import { ArticleCountry } from '../../../../domain/value-objects/article-country.vo.js';
import { ArticleLanguage } from '../../../../domain/value-objects/article-language.vo.js';

import type { MonitoringPort } from '../../../outbound/monitoring/monitoring.port.js';

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
        return monitoring.monitorBackgroundJob('Jobs', 'ArticleGeneration', async () => {
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
                monitoring.incrementMetric('Jobs/ArticleGeneration/Success');
            } catch (error) {
                monitoring.incrementMetric('Jobs/ArticleGeneration/Error');
                throw error;
            }
        });
    },
    executeOnStartup: true,
    name: 'article-generation',
    schedule: '5 * * * *', // Run at 5 minutes past every hour
});
