import { type Job } from '../../../../application/ports/inbound/job-runner.port.js';
import { type GenerateArticlesUseCase } from '../../../../application/use-cases/articles/generate-articles.use-case.js';

type Dependencies = {
    generateArticles: GenerateArticlesUseCase;
};

/**
 * Creates the article generation job with its dependencies
 */
export const createArticleGenerationJob = ({ generateArticles }: Dependencies): Job => ({
    execute: () => generateArticles.execute(),
    executeOnStartup: true, // We want articles available immediately on startup
    name: 'article-generation',
    schedule: '0 11 * * *', // Run at 11 AM daily
});
