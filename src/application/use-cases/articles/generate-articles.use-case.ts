import { format, getHours, subDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

import { ArticleCountry } from '../../../domain/value-objects/article-country.vo.js';
import { ArticleLanguage } from '../../../domain/value-objects/article-language.vo.js';

import { type ArticleGeneratorPort } from '../../ports/outbound/ai/article-generator.port.js';
import { type NewsPort } from '../../ports/outbound/data-sources/news.port.js';
import { type LoggerPort } from '../../ports/outbound/logging/logger.port.js';
import { type ArticleRepositoryPort } from '../../ports/outbound/persistence/article-repository.port.js';

/**
 * Map of country codes to their timezone identifiers
 */
const COUNTRY_TIMEZONES: Record<string, string> = {
    fr: 'Europe/Paris',
    us: 'America/New_York',
};

/**
 * Get the current hour in the country's timezone
 */
function getCurrentHourInCountry(country: ArticleCountry): { hour: number; timezone: string } {
    const countryCode = country.toString().toLowerCase();
    const timezone = COUNTRY_TIMEZONES[countryCode];

    if (!timezone) {
        throw new Error(`Unsupported country: ${countryCode}`);
    }

    const now = new Date();
    const zonedDate = toZonedTime(now, timezone);
    const hour = getHours(zonedDate);

    return { hour, timezone };
}

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

            // Get current time in the target country's timezone
            const { hour, timezone } = getCurrentHourInCountry(country);
            const targetArticleCount = getTargetArticleCount(hour);

            // Check existing articles for today
            const now = new Date();
            const zonedNow = toZonedTime(now, timezone);
            const existingArticleCount = await articleRepository.countArticlesForDay({
                country,
                date: zonedNow,
                language,
            });

            // Calculate how many articles we need to generate
            const articlesToGenerate = targetArticleCount - existingArticleCount;

            if (articlesToGenerate <= 0) {
                logger.info('No new articles needed at this time', {
                    country,
                    currentCount: existingArticleCount,
                    hour: format(zonedNow, 'HH'),
                    language,
                    targetCount: targetArticleCount,
                    timezone,
                });
                return;
            }

            // Fetch real articles from news service
            const news = await newsService.fetchNews({
                country,
                language,
            });

            if (news.length === 0) {
                logger.warn('No articles found', { country, language });
                return;
            }

            // Get recent headlines for context (last 30 days)
            const since = subDays(zonedNow, 30);
            const publishedSummaries = await articleRepository.findPublishedSummaries({
                country,
                language,
                since,
            });

            // Generate AI articles based on real ones
            const generatedArticles = await articleGenerator.generateArticles({
                articles: {
                    news: news.map((article) => ({
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
                hour: format(zonedNow, 'HH'),
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
