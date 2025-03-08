import { type Country, type Language } from '@prisma/client';

import { ArticleStatus } from '../../../domain/value-objects/article-status.vo.js';

import { type NewsPort } from '../../ports/outbound/data-sources/news.port.js';
import { type LoggerPort } from '../../ports/outbound/logging/logger.port.js';
import { type ArticleRepository } from '../../ports/outbound/persistence/article.repository.port.js';

type Dependencies = {
    articleRepository: ArticleRepository;
    logger: LoggerPort;
    newsService: NewsPort;
};

/**
 * Use case for generating articles from news sources
 */
export class GenerateArticlesUseCase {
    constructor(private readonly deps: Dependencies) {}

    /**
     * Generate articles for a specific language and country
     */
    public async execute(language: Language = 'en', sourceCountry: Country = 'us'): Promise<void> {
        const { articleRepository, logger, newsService } = this.deps;

        try {
            logger.info('Starting article generation', { language, sourceCountry });

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
            logger.error('Failed to generate articles', { error, language, sourceCountry });
            throw error; // Re-throw to let the job handle the error
        }
    }
}
