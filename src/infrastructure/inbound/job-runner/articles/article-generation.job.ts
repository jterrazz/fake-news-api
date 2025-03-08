import { type Country, type Language } from '@prisma/client';

import { type Job } from '../../../../application/ports/inbound/job-runner.port.js';
import { type NewsPort } from '../../../../application/ports/outbound/data-sources/news.port.js';
import { type LoggerPort } from '../../../../application/ports/outbound/logging/logger.port.js';
import { type ArticleRepository } from '../../../../application/ports/outbound/persistence/article.repository.port.js';

import { ArticleStatus } from '../../../../domain/value-objects/article-status.vo.js';

type Dependencies = {
    articleRepository: ArticleRepository;
    logger: LoggerPort;
    newsService: NewsPort;
};

/**
 * Creates the article generation job with its dependencies
 */
export const createArticleGenerationJob = ({
    articleRepository,
    logger,
    newsService,
}: Dependencies): Job => {
    const generateDailyArticles = async (): Promise<void> => {
        try {
            logger.info('Starting daily article generation');

            // For now just handle English articles
            const language: Language = 'en';
            const sourceCountry: Country = 'us';

            const articles = await newsService.fetchNews({
                language,
                sourceCountry,
            });

            if (articles.length === 0) {
                logger.warn('No articles found', { language, sourceCountry });
                return;
            }

            // Store articles in the database
            await articleRepository.createMany(
                articles.map((article) => ({
                    content: article.summary,
                    language,
                    publishedAt: new Date(article.publishDate),
                    sourceCountry,
                    sourceUrl: article.url,
                    status: ArticleStatus.PENDING,
                    title: article.title,
                })),
            );

            logger.info('Successfully stored articles', {
                articleCount: articles.length,
                language,
                sourceCountry,
            });
        } catch (error) {
            logger.error('Failed to generate daily articles', { error });
        }
    };

    return {
        execute: generateDailyArticles,
        executeOnStartup: true, // We want articles available immediately on startup
        name: 'article-generation',
        schedule: '0 11 * * *', // Run at 11 AM daily
    };
};
