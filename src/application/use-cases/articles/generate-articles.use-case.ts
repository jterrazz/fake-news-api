import { ArticleCountry } from '../../../domain/value-objects/article-country.vo.js';
import { ArticleLanguage } from '../../../domain/value-objects/article-language.vo.js';

import { type ArticleGeneratorPort } from '../../ports/outbound/ai/article-generator.port.js';
import { type NewsPort } from '../../ports/outbound/data-sources/news.port.js';
import { type LoggerPort } from '../../ports/outbound/logging/logger.port.js';
import { type ArticleRepositoryPort } from '../../ports/outbound/persistence/article-repository.port.js';

import {
    createCurrentTZDate,
    formatInTimezone,
    getCurrentHourInTimezone,
    getTimezoneForCountry,
    subtractDaysInTimezone,
} from '../../../shared/date/timezone.js';

/**
 * Determines the target number of articles based on the hour
 */
function getTargetArticleCount(hour: number): number {
    if (hour < 6) return 0;
    if (hour < 12) return 4;
    if (hour < 17) return 8;
    return 12;
}

type Dependencies = {
    articleGenerator: ArticleGeneratorPort;
    articleRepository: ArticleRepositoryPort;
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

            // Get timezone and current hour
            const timezone = getTimezoneForCountry(country.toString());
            const hour = getCurrentHourInTimezone(timezone);
            const targetArticleCount = getTargetArticleCount(hour);

            // Check existing articles for today
            const tzDate = createCurrentTZDate(timezone);
            const existingArticleCount = await articleRepository.countManyForDay({
                country,
                date: tzDate,
                language,
            });

            // Calculate how many articles we need to generate
            const articlesToGenerate = targetArticleCount - existingArticleCount;

            if (articlesToGenerate <= 0) {
                logger.info('No new articles needed at this time', {
                    country,
                    currentCount: existingArticleCount,
                    hour: formatInTimezone(tzDate, timezone, 'HH'),
                    language,
                    targetCount: targetArticleCount,
                    timezone,
                });
                return;
            }

            // Fetch real articles from news service
            // TODO Use maybe full content article to generate fake articles
            const news = await newsService.fetchNews({
                country,
                language,
            });

            if (news.length === 0) {
                logger.warn('No articles found', { country, language });
                return;
            }

            // Get recent headlines for context (last 30 days)
            const since = subtractDaysInTimezone(tzDate, timezone, 30);
            // TODO Use more than just the summary
            const publishedSummaries = await articleRepository.findPublishedSummaries({
                country,
                language,
                since,
            });

            // Generate AI articles based on real ones
            const generatedArticles = await articleGenerator.generateArticles({
                articles: {
                    news: news.map((article) => ({
                        // TODO Fix this
                        content: article.summary,
                        title: article.title,
                    })),
                    publicationHistory: publishedSummaries,
                },
                count: articlesToGenerate,
                country,
                language,
            });

            await articleRepository.createMany(generatedArticles);

            logger.info('Successfully stored articles', {
                country,
                currentCount: existingArticleCount + generatedArticles.length,
                generatedCount: generatedArticles.length,
                hour: formatInTimezone(tzDate, timezone, 'HH'),
                language,
                targetCount: targetArticleCount,
                timezone,
            });
        } catch (error) {
            logger.error('Failed to generate articles', { country, error, language });
            throw error;
        }
    }
}
