import { setHours, setMilliseconds, setMinutes, setSeconds } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { mock } from 'jest-mock-extended';

import { Article } from '../../../../domain/entities/article.js';
import { ArticleCategory } from '../../../../domain/value-objects/article-category.vo.js';
import { ArticleContent } from '../../../../domain/value-objects/article-content.vo.js';
import {
    ArticleCountry,
    CountryEnum,
} from '../../../../domain/value-objects/article-country.vo.js';
import { ArticleFakeStatus } from '../../../../domain/value-objects/article-fake-status.vo.js';
import { ArticleHeadline } from '../../../../domain/value-objects/article-headline.vo.js';
import {
    ArticleLanguage,
    LanguageEnum,
} from '../../../../domain/value-objects/article-language.vo.js';
import { ArticleSummary } from '../../../../domain/value-objects/article-summary.vo.js';

import { type ArticleGeneratorPort } from '../../../ports/outbound/ai/article-generator.port.js';
import { type NewsPort } from '../../../ports/outbound/data-sources/news.port.js';
import { type NewsArticle } from '../../../ports/outbound/data-sources/news.port.js';
import { type LoggerPort } from '../../../ports/outbound/logging/logger.port.js';
import { type ArticleRepositoryPort } from '../../../ports/outbound/persistence/article-repository.port.js';

import { GenerateArticlesUseCase } from '../generate-articles.use-case.js';

/**
 * Helper function to get target article count based on hour
 */
function getTargetArticleCount(hour: number): number {
    if (hour < 6) return 0;
    if (hour < 12) return 4;
    if (hour < 17) return 8;
    return 12;
}

/**
 * Helper to create a date at a specific hour in a timezone
 */
function createDateAtHour(hour: number, timezone: string): Date {
    // Create date at the specified hour in local time
    const localDate = setMilliseconds(setSeconds(setMinutes(setHours(new Date(), hour), 0), 0), 0);

    // Convert to UTC based on the target timezone
    return fromZonedTime(localDate, timezone);
}

describe('GenerateArticlesUseCase', () => {
    // Mocks
    const mockArticleGenerator = mock<ArticleGeneratorPort>();
    const mockArticleRepository = mock<ArticleRepositoryPort>();
    const mockLogger = mock<LoggerPort>();
    const mockNewsService = mock<NewsPort>();

    // Test data
    const testCountry = ArticleCountry.create(CountryEnum.UnitedStates);
    const testLanguage = ArticleLanguage.create(LanguageEnum.English);

    const testNews: NewsArticle[] = Array.from({ length: 12 }, (_, i) => ({
        publishedAt: new Date(`2024-03-${String(i + 1).padStart(2, '0')}`),
        summary: `Summary of real news ${i + 1}`,
        title: `Real News ${i + 1}`,
        url: `https://example.com/${i + 1}`,
    }));

    const testPublishedSummaries: string[] = Array.from(
        { length: 12 },
        (_, i) => `Old Article ${i + 1} from 2024-01-${String(i + 1).padStart(2, '0')}`,
    );

    const testGeneratedArticles: Article[] = Array.from({ length: 12 }, (_, i) =>
        Article.create({
            category: ArticleCategory.create(i % 2 === 0 ? 'POLITICS' : 'TECHNOLOGY'),
            content: ArticleContent.create(
                `This is article ${i + 1} with detailed content about ${i % 2 === 0 ? 'political' : 'technological'} developments. ` +
                    'The content discusses various aspects and their potential impacts on society. ' +
                    'Multiple perspectives are presented to provide a balanced view.',
            ),
            country: testCountry,
            createdAt: new Date(),
            fakeStatus: ArticleFakeStatus.createFake('AI-generated content for testing'),
            headline: ArticleHeadline.create(`Generated Article ${i + 1}`),
            language: testLanguage,
            summary: ArticleSummary.create(`Summary of generated article ${i + 1}`),
        }),
    );

    // System under test
    let useCase: GenerateArticlesUseCase;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        jest.useFakeTimers();

        // Initialize use case with mocked dependencies
        useCase = new GenerateArticlesUseCase({
            articleGenerator: mockArticleGenerator,
            articleRepository: mockArticleRepository,
            logger: mockLogger,
            newsService: mockNewsService,
        });

        // Default mock implementations
        mockNewsService.fetchNews.mockResolvedValue(testNews);
        mockArticleRepository.findPublishedSummaries.mockResolvedValue(testPublishedSummaries);
        mockArticleRepository.countArticlesForDay.mockResolvedValue(0);
        mockArticleGenerator.generateArticles.mockResolvedValue(testGeneratedArticles);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('execute', () => {
        it.each([
            { existingCount: 0, expectedToGenerate: 4, hour: 7 },
            { existingCount: 2, expectedToGenerate: 2, hour: 7 },
            { existingCount: 4, expectedToGenerate: 4, hour: 14 },
            { existingCount: 6, expectedToGenerate: 2, hour: 14 },
            { existingCount: 8, expectedToGenerate: 4, hour: 18 },
            { existingCount: 10, expectedToGenerate: 2, hour: 18 },
            { existingCount: 0, expectedToGenerate: 12, hour: 18 },
        ])(
            'should generate correct number of articles based on time - $hour:00 with $existingCount existing (US)',
            async ({ existingCount, hour, expectedToGenerate }) => {
                // Given
                const testDate = createDateAtHour(hour, 'America/New_York');
                jest.setSystemTime(testDate);

                mockArticleRepository.countArticlesForDay.mockResolvedValue(existingCount);
                mockArticleGenerator.generateArticles.mockResolvedValue(
                    testGeneratedArticles.slice(0, expectedToGenerate),
                );

                // When
                await useCase.execute(testLanguage, testCountry);

                // Then
                if (expectedToGenerate > 0) {
                    expect(mockArticleGenerator.generateArticles).toHaveBeenCalledWith({
                        articles: {
                            news: testNews.map((article) => ({
                                content: article.summary,
                                title: article.title,
                            })),
                            publicationHistory: testPublishedSummaries,
                        },
                        count: expectedToGenerate,
                        country: testCountry,
                        language: testLanguage,
                    });

                    expect(mockArticleRepository.createMany).toHaveBeenCalledWith(
                        testGeneratedArticles.slice(0, expectedToGenerate),
                    );

                    expect(mockLogger.info).toHaveBeenNthCalledWith(
                        1,
                        'Starting article generation',
                        {
                            country: testCountry,
                            language: testLanguage,
                        },
                    );

                    expect(mockLogger.info).toHaveBeenNthCalledWith(
                        2,
                        'Successfully stored articles',
                        {
                            country: testCountry,
                            currentCount: existingCount + expectedToGenerate,
                            generatedCount: expectedToGenerate,
                            hour: hour < 10 ? `0${hour}` : hour.toString(),
                            language: testLanguage,
                            targetCount: getTargetArticleCount(hour),
                            timezone: 'America/New_York',
                        },
                    );
                } else {
                    expect(mockArticleGenerator.generateArticles).not.toHaveBeenCalled();
                    expect(mockArticleRepository.createMany).not.toHaveBeenCalled();
                }
            },
        );

        it.each([
            { existingCount: 0, expectedToGenerate: 4, hour: 7 },
            { existingCount: 2, expectedToGenerate: 2, hour: 7 },
            { existingCount: 4, expectedToGenerate: 4, hour: 14 },
            { existingCount: 6, expectedToGenerate: 2, hour: 14 },
            { existingCount: 8, expectedToGenerate: 4, hour: 18 },
            { existingCount: 10, expectedToGenerate: 2, hour: 18 },
            { existingCount: 0, expectedToGenerate: 12, hour: 18 },
        ])(
            'should generate correct number of articles based on time - $hour:00 with $existingCount existing (France)',
            async ({ existingCount, hour, expectedToGenerate }) => {
                // Given
                const testDate = createDateAtHour(hour, 'Europe/Paris');
                jest.setSystemTime(testDate);

                const frenchCountry = ArticleCountry.create(CountryEnum.France);
                const frenchLanguage = ArticleLanguage.create(LanguageEnum.French);

                mockArticleRepository.countArticlesForDay.mockResolvedValue(existingCount);
                mockArticleGenerator.generateArticles.mockResolvedValue(
                    testGeneratedArticles.slice(0, expectedToGenerate),
                );

                // When
                await useCase.execute(frenchLanguage, frenchCountry);

                // Then
                if (expectedToGenerate > 0) {
                    expect(mockArticleGenerator.generateArticles).toHaveBeenCalledWith({
                        articles: {
                            news: testNews.map((article) => ({
                                content: article.summary,
                                title: article.title,
                            })),
                            publicationHistory: testPublishedSummaries,
                        },
                        count: expectedToGenerate,
                        country: frenchCountry,
                        language: frenchLanguage,
                    });

                    expect(mockArticleRepository.createMany).toHaveBeenCalledWith(
                        testGeneratedArticles.slice(0, expectedToGenerate),
                    );

                    expect(mockLogger.info).toHaveBeenNthCalledWith(
                        1,
                        'Starting article generation',
                        {
                            country: frenchCountry,
                            language: frenchLanguage,
                        },
                    );

                    expect(mockLogger.info).toHaveBeenNthCalledWith(
                        2,
                        'Successfully stored articles',
                        {
                            country: frenchCountry,
                            currentCount: existingCount + expectedToGenerate,
                            generatedCount: expectedToGenerate,
                            hour: hour < 10 ? `0${hour}` : hour.toString(),
                            language: frenchLanguage,
                            targetCount: getTargetArticleCount(hour),
                            timezone: 'Europe/Paris',
                        },
                    );
                } else {
                    expect(mockArticleGenerator.generateArticles).not.toHaveBeenCalled();
                    expect(mockArticleRepository.createMany).not.toHaveBeenCalled();
                }
            },
        );

        it('should not generate articles before 6am (France)', async () => {
            // Given
            const testDate = createDateAtHour(4, 'Europe/Paris');
            jest.setSystemTime(testDate);

            const frenchCountry = ArticleCountry.create(CountryEnum.France);
            const frenchLanguage = ArticleLanguage.create(LanguageEnum.French);

            // When
            await useCase.execute(frenchLanguage, frenchCountry);

            // Then
            expect(mockLogger.info).toHaveBeenNthCalledWith(1, 'Starting article generation', {
                country: frenchCountry,
                language: frenchLanguage,
            });

            expect(mockLogger.info).toHaveBeenNthCalledWith(
                2,
                'No new articles needed at this time',
                {
                    country: frenchCountry,
                    currentCount: 0,
                    hour: '04',
                    language: frenchLanguage,
                    targetCount: 0,
                    timezone: 'Europe/Paris',
                },
            );
            expect(mockArticleGenerator.generateArticles).not.toHaveBeenCalled();
            expect(mockArticleRepository.createMany).not.toHaveBeenCalled();
        });

        it('should handle case when no news articles are found', async () => {
            // Given
            const testDate = createDateAtHour(7, 'America/New_York');
            jest.setSystemTime(testDate);

            mockNewsService.fetchNews.mockResolvedValue([]);

            // When
            await useCase.execute(testLanguage, testCountry);

            // Then
            expect(mockLogger.warn).toHaveBeenCalledWith('No articles found', {
                country: testCountry,
                language: testLanguage,
            });
            expect(mockArticleGenerator.generateArticles).not.toHaveBeenCalled();
            expect(mockArticleRepository.createMany).not.toHaveBeenCalled();
        });

        it('should handle and re-throw errors during execution', async () => {
            // Given
            const testError = new Error('Test error');
            mockNewsService.fetchNews.mockRejectedValue(testError);

            // When/Then
            await expect(useCase.execute(testLanguage, testCountry)).rejects.toThrow(testError);

            expect(mockLogger.error).toHaveBeenCalledWith('Failed to generate articles', {
                country: testCountry,
                error: testError,
                language: testLanguage,
            });
        });
    });
});
