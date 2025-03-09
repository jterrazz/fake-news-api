import { type Country, type Language } from '@prisma/client';

import { Article } from '../../../domain/entities/article.js';
import { ArticleCategory } from '../../../domain/value-objects/article-category.vo.js';
import { ArticleCountry } from '../../../domain/value-objects/article-country.vo.js';
import { ArticleLanguage } from '../../../domain/value-objects/article-language.vo.js';

import { type ArticleGeneratorPort } from '../../ports/outbound/ai/article-generator.port.js';
import { type NewsPort } from '../../ports/outbound/data-sources/news.port.js';
import { type LoggerPort } from '../../ports/outbound/logging/logger.port.js';
import { type ArticleRepository } from '../../ports/outbound/persistence/article.repository.port.js';

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
    public async execute(language: Language = 'en', sourceCountry: Country = 'us'): Promise<void> {
        const { articleGenerator, articleRepository, logger, newsService } = this.deps;

        try {
            logger.info('Starting article generation', { language, sourceCountry });

            // Fetch real articles from news service
            const realArticles = await newsService.fetchNews({
                language,
                sourceCountry,
            });

            if (realArticles.length === 0) {
                logger.warn('No articles found', { language, sourceCountry });
                return;
            }

            // Get recent articles for context
            const recentArticles = await articleRepository.findRecentArticles({
                language,
                sourceCountry,
            });

            // Generate AI articles based on real ones
            const generatedArticles = await articleGenerator.generateArticles({
                language,
                recentArticles,
                sourceArticles: realArticles,
                sourceCountry,
            });

            // Store both real and generated articles
            const articlesToStore = [
                ...realArticles.map((article) =>
                    Article.create({
                        article: article.summary ?? '',
                        category: ArticleCategory.NEWS,
                        country: new ArticleCountry(sourceCountry),
                        headline: article.title,
                        isFake: false,
                        language: new ArticleLanguage(language),
                        summary: article.summary ?? '',
                    }),
                ),
                ...generatedArticles,
            ];

            await articleRepository.createMany(articlesToStore);

            logger.info('Successfully stored articles', {
                articleCount: articlesToStore.length,
                fakeCount: generatedArticles.length,
                language,
                realCount: realArticles.length,
                sourceCountry,
            });
        } catch (error) {
            logger.error('Failed to generate articles', { error, language, sourceCountry });
            throw error; // Re-throw to let the job handle the error
        }
    }
}
