import { type LoggerPort } from '@jterrazz/logger';
import { endOfDay, startOfDay } from 'date-fns';

import { type Country } from '../../../domain/value-objects/country.vo.js';
import { type Language } from '../../../domain/value-objects/language.vo.js';

import { type ArticleGeneratorPort } from '../../ports/outbound/ai/article-generator.port.js';
import { type ArticleRepositoryPort } from '../../ports/outbound/persistence/article-repository.port.js';
import { type NewsProviderPort } from '../../ports/outbound/providers/news.port.js';

import {
    createCurrentTZDateForCountry,
    formatTZDateForCountry,
    subtractDays,
} from '../../../shared/date/timezone.js';

/**
 * Use case for generating articles from news sources
 */
export class GenerateArticlesUseCase {
    constructor(
        private readonly articleGenerator: ArticleGeneratorPort,
        private readonly articleRepository: ArticleRepositoryPort,
        private readonly logger: LoggerPort,
        private readonly newsService: NewsProviderPort,
    ) {}

    /**
     * Generate articles for a specific language and country
     */
    public async execute(language: Language, country: Country): Promise<void> {
        try {
            this.logger.info(
                `Starting article generation for ${country.toString()} in ${language.toString()}`,
            );

            const tzDate = createCurrentTZDateForCountry(country.toString());
            const targetArticleCount = getTargetArticleCount(tzDate.getHours());

            // Calculate day boundaries in the target timezone
            const dayStart = startOfDay(tzDate);
            const dayEnd = endOfDay(tzDate);

            // Check existing articles for today using the cleaner repository method
            const existingArticleCount = await this.articleRepository.countMany({
                country,
                endDate: dayEnd,
                language,
                startDate: dayStart,
            });

            // Calculate how many articles we need to generate
            const articlesToGenerate = targetArticleCount - existingArticleCount;

            if (articlesToGenerate <= 0) {
                this.logger.info(
                    `No new articles needed at this time for ${country.toString()} in ${language.toString()}`,
                    {
                        currentCount: existingArticleCount,
                        hour: formatTZDateForCountry(tzDate, country.toString(), 'HH'),
                        targetCount: targetArticleCount,
                    },
                );
                return;
            }

            // Fetch real articles from news service
            const news = await this.newsService.fetchNews({
                country,
                language,
            });

            // Filter news articles by coverage (moved from adapter)
            const sortedByCount = [...news].sort((a, b) => b.coverage - a.coverage);
            const filteredNews = sortedByCount.filter((article) => article.coverage > 2);

            if (filteredNews.length === 0) {
                this.logger.warn('No articles found', {
                    country: country.toString(),
                    language: language.toString(),
                });
                return;
            }

            const minArticlesLength = Math.floor(targetArticleCount * 0.6);
            if (filteredNews.length < minArticlesLength) {
                this.logger.warn('Not enough articles found', {
                    country: country.toString(),
                    currentCount: filteredNews.length,
                    language: language.toString(),
                    minArticlesLength,
                });
                return;
            }

            // Get recent headlines for context (last 30 days)
            const since = subtractDays(tzDate, 30);
            const publishedSummaries = await this.articleRepository.findHeadlinesAndSummaries({
                country,
                language,
                since,
            });

            // Generate AI articles based on real ones
            const generatedArticles = await this.articleGenerator.generateArticles({
                articles: {
                    news: filteredNews.map((article) => ({
                        content: article.body,
                        headline: article.headline,
                    })),
                    publicationHistory: publishedSummaries.map((summary) => ({
                        headline: summary.headline,
                        summary: summary.summary,
                    })),
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
                hour: formatTZDateForCountry(tzDate, country.toString(), 'HH'),
                language: language.toString(),
                targetCount: targetArticleCount,
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

/**
 * Determines the target number of articles based on the hour
 */
function getTargetArticleCount(hour: number): number {
    // 3 updates per day: 7:00, 14:00, 20:00
    if (hour < 7) return 0;
    if (hour < 14) return 4;
    if (hour < 20) return 8;
    return 12;
}
