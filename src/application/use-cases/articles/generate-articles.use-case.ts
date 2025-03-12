import { ArticleCountry } from '../../../domain/value-objects/article-country.vo.js';
import { ArticleLanguage } from '../../../domain/value-objects/article-language.vo.js';

import { type ArticleGeneratorPort } from '../../ports/outbound/ai/article-generator.port.js';
import { type NewsPort } from '../../ports/outbound/data-sources/news.port.js';
import { type LoggerPort } from '../../ports/outbound/logging/logger.port.js';
import { type ArticleRepository } from '../../ports/outbound/persistence/article-repository.port.js';

type Dependencies = {
    articleGenerator: ArticleGeneratorPort;
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
    public async execute(language: ArticleLanguage, country: ArticleCountry): Promise<void> {
        const { articleGenerator, articleRepository, logger, newsService } = this.deps;

        try {
            logger.info('Starting article generation', { country, language });

            // Fetch real articles from news service
            const news = await newsService.fetchNews({
                country,
                language,
            });

            if (news.length === 0) {
                logger.warn('No articles found', { country, language });
                return;
            }

            // Get recent headlines for context
            const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
            const publishedSummaries = await articleRepository.findPublishedSummaries({
                country,
                language,
                since,
            });

            // Generate AI articles based on real ones
            const generatedArticles = await articleGenerator.generateArticles({
                articles: {
                    news,
                    publicationHistory: publishedSummaries,
                },
                country,
                language,
            });

            await articleRepository.createMany(generatedArticles);

            logger.info('Successfully stored articles', {
                country,
                generatedCount: generatedArticles.length,
                language,
            });
        } catch (error) {
            logger.error('Failed to generate articles', { country, error, language });
            throw error; // Re-throw to let the job handle the error
        }
    }
}
