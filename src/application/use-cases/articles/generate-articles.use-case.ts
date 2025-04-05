import { type LoggerPort } from '@jterrazz/logger';

import { ArticleCountry } from '../../../domain/value-objects/article-country.vo.js';
import { ArticleLanguage } from '../../../domain/value-objects/article-language.vo.js';

import { type ArticleGeneratorPort } from '../../ports/outbound/ai/article-generator.port.js';
import { type NewsPort } from '../../ports/outbound/data-sources/news.port.js';
import { type ArticleRepositoryPort } from '../../ports/outbound/persistence/article-repository.port.js';

import {
    formatInTimezone,
    getTimezoneForCountry,
    subtractDaysInTimezone,
    TZDate,
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

/**
 * Use case for generating articles from news sources
 */
export class GenerateArticlesUseCase {
    constructor(
        private readonly articleGenerator: ArticleGeneratorPort,
        private readonly articleRepository: ArticleRepositoryPort,
        private readonly logger: LoggerPort,
        private readonly newsService: NewsPort,
    ) {}

    /**
     * Generate articles for a specific language and country
     */
    public async execute(language: ArticleLanguage, country: ArticleCountry): Promise<void> {
        try {
            this.logger.info(
                `Starting article generation for ${country.toString()} in ${language.toString()}`,
            );

            // Get timezone and current hour
            const timezone = getTimezoneForCountry(country.toString());
            const tzDate = new TZDate(Date.now(), timezone);
            const hour = tzDate.getHours();
            const targetArticleCount = getTargetArticleCount(hour);

            // Check existing articles for today
            const existingArticleCount = await this.articleRepository.countManyForDay({
                country,
                date: tzDate,
                language,
            });

            // Calculate how many articles we need to generate
            const articlesToGenerate = targetArticleCount - existingArticleCount;

            if (articlesToGenerate <= 0) {
                this.logger.info(
                    `No new articles needed at this time for ${country.toString()} in ${language.toString()}`,
                    {
                        currentCount: existingArticleCount,
                        hour: formatInTimezone(tzDate, timezone, 'HH'),
                        targetCount: targetArticleCount,
                        timezone,
                    },
                );
                return;
            }

            // Fetch real articles from news service
            const news = await this.newsService.fetchNews({
                country,
                language,
            });

            if (news.length === 0) {
                this.logger.warn('No articles found', {
                    country: country.toString(),
                    language: language.toString(),
                });
                return;
            }

            // Get recent headlines for context (last 30 days)
            const since = subtractDaysInTimezone(tzDate, timezone, 30);
            const publishedSummaries = await this.articleRepository.findPublishedSummaries({
                country,
                language,
                since,
            });

            // Generate AI articles based on real ones
            const generatedArticles = await this.articleGenerator.generateArticles({
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

            await this.articleRepository.createMany(generatedArticles);

            this.logger.info('Successfully stored articles', {
                country: country.toString(),
                currentCount: existingArticleCount + generatedArticles.length,
                generatedCount: generatedArticles.length,
                hour: formatInTimezone(tzDate, timezone, 'HH'),
                language: language.toString(),
                targetCount: targetArticleCount,
                timezone,
            });
        } catch (error) {
            this.logger.error('Failed to generate articles', {
                country: country.toString(),
                error,
                language: language.toString(),
            });
            throw error;
        }
    }
}
