import { DeepMockProxy, mock } from 'jest-mock-extended';

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
import { type NewsArticle, type NewsPort } from '../../../ports/outbound/data-sources/news.port.js';
import { type LoggerPort } from '../../../ports/outbound/logging/logger.port.js';
import { type ArticleRepositoryPort } from '../../../ports/outbound/persistence/article-repository.port.js';

import { TZDate } from '../../../../shared/date/timezone.js';
import { GenerateArticlesUseCase } from '../generate-articles.use-case.js';

describe('GenerateArticlesUseCase', () => {
    // Test helpers
    const createTestNews = (count: number): NewsArticle[] =>
        Array.from({ length: count }, (_, i) => ({
            publishedAt: new Date(`2024-03-${String(i + 1).padStart(2, '0')}`),
            summary: `Summary of real news ${i + 1}`,
            title: `Real News ${i + 1}`,
            url: `https://example.com/${i + 1}`,
        }));

    const createTestArticles = (
        count: number,
        country: ArticleCountry,
        language: ArticleLanguage,
    ): Article[] =>
        Array.from({ length: count }, (_, i) =>
            Article.create({
                category: ArticleCategory.create(i % 2 === 0 ? 'POLITICS' : 'TECHNOLOGY'),
                content: ArticleContent.create(
                    `This is article ${i + 1} with detailed content about ${i % 2 === 0 ? 'political' : 'technological'} developments. ` +
                        'The content discusses various aspects and their potential impacts on society. ' +
                        'Multiple perspectives are presented to provide a balanced view.',
                ),
                country,
                createdAt: new Date(),
                fakeStatus: ArticleFakeStatus.createFake('AI-generated content for testing'),
                headline: ArticleHeadline.create(`Generated Article ${i + 1}`),
                language,
                summary: ArticleSummary.create(`Summary of generated article ${i + 1}`),
            }),
        );

    /**
     * Helper function to get target article count based on hour of the day
     * - Before 6am: 0 articles
     * - 6am to 12pm: 4 articles
     * - 12pm to 5pm: 8 articles
     * - After 5pm: 12 articles
     */
    function getTargetArticleCount(hour: number): number {
        if (hour < 6) return 0;
        if (hour < 12) return 4;
        if (hour < 17) return 8;
        return 12;
    }

    /**
     * Helper to create a date at a specific hour in a timezone
     * Used to simulate different times of day in different timezones
     */
    function createDateAtHour(hour: number, timezone: string): Date {
        const now = new Date();
        // Create a date at midnight in the target timezone
        const tzDate = new TZDate(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            0, // Start at midnight
            0,
            0,
            0,
            timezone,
        );

        // Add the specified hours
        return new TZDate(tzDate.getTime() + hour * 60 * 60 * 1000, timezone);
    }

    // Test fixtures
    const TEST_COUNTRY = ArticleCountry.create(CountryEnum.UnitedStates);
    const TEST_LANGUAGE = ArticleLanguage.create(LanguageEnum.English);
    const TEST_ARTICLE_COUNT = 12;

    // Mocks setup
    let mockArticleGenerator: DeepMockProxy<ArticleGeneratorPort>;
    let mockArticleRepository: DeepMockProxy<ArticleRepositoryPort>;
    let mockLogger: DeepMockProxy<LoggerPort>;
    let mockNewsService: DeepMockProxy<NewsPort>;
    let useCase: GenerateArticlesUseCase;

    // Test data
    let testNews: NewsArticle[];
    let testArticles: Article[];
    let testPublishedSummaries: string[];

    beforeEach(() => {
        // Initialize mocks
        mockArticleGenerator = mock<ArticleGeneratorPort>();
        mockArticleRepository = mock<ArticleRepositoryPort>();
        mockLogger = mock<LoggerPort>();
        mockNewsService = mock<NewsPort>();

        // Initialize test data
        testNews = createTestNews(TEST_ARTICLE_COUNT);
        testArticles = createTestArticles(TEST_ARTICLE_COUNT, TEST_COUNTRY, TEST_LANGUAGE);
        testPublishedSummaries = Array.from(
            { length: TEST_ARTICLE_COUNT },
            (_, i) => `Old Article ${i + 1} from 2024-01-${String(i + 1).padStart(2, '0')}`,
        );

        // Setup mock responses
        mockNewsService.fetchNews.mockResolvedValue(testNews);
        mockArticleRepository.findPublishedSummaries.mockResolvedValue(testPublishedSummaries);
        mockArticleRepository.countManyForDay.mockResolvedValue(0);
        mockArticleGenerator.generateArticles.mockResolvedValue(testArticles);

        // Initialize use case
        useCase = new GenerateArticlesUseCase({
            articleGenerator: mockArticleGenerator,
            articleRepository: mockArticleRepository,
            logger: mockLogger,
            newsService: mockNewsService,
        });

        // Setup time mocking
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
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

                mockArticleRepository.countManyForDay.mockResolvedValue(existingCount);
                mockArticleGenerator.generateArticles.mockResolvedValue(
                    testArticles.slice(0, expectedToGenerate),
                );

                // When
                await useCase.execute(TEST_LANGUAGE, TEST_COUNTRY);

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
                        country: TEST_COUNTRY,
                        language: TEST_LANGUAGE,
                    });

                    expect(mockArticleRepository.createMany).toHaveBeenCalledWith(
                        testArticles.slice(0, expectedToGenerate),
                    );

                    expect(mockLogger.info).toHaveBeenNthCalledWith(
                        1,
                        'Starting article generation',
                        {
                            country: TEST_COUNTRY.toString(),
                            language: TEST_LANGUAGE.toString(),
                        },
                    );

                    expect(mockLogger.info).toHaveBeenNthCalledWith(
                        2,
                        'Successfully stored articles',
                        {
                            country: TEST_COUNTRY.toString(),
                            currentCount: existingCount + expectedToGenerate,
                            generatedCount: expectedToGenerate,
                            hour: hour < 10 ? `0${hour}` : hour.toString(),
                            language: TEST_LANGUAGE.toString(),
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

                mockArticleRepository.countManyForDay.mockResolvedValue(existingCount);
                mockArticleGenerator.generateArticles.mockResolvedValue(
                    testArticles.slice(0, expectedToGenerate),
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
                        testArticles.slice(0, expectedToGenerate),
                    );

                    expect(mockLogger.info).toHaveBeenNthCalledWith(
                        1,
                        'Starting article generation',
                        {
                            country: frenchCountry.toString(),
                            language: frenchLanguage.toString(),
                        },
                    );

                    expect(mockLogger.info).toHaveBeenNthCalledWith(
                        2,
                        'Successfully stored articles',
                        {
                            country: frenchCountry.toString(),
                            currentCount: existingCount + expectedToGenerate,
                            generatedCount: expectedToGenerate,
                            hour: hour < 10 ? `0${hour}` : hour.toString(),
                            language: frenchLanguage.toString(),
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
                country: frenchCountry.toString(),
                language: frenchLanguage.toString(),
            });

            expect(mockLogger.info).toHaveBeenNthCalledWith(
                2,
                'No new articles needed at this time',
                {
                    country: frenchCountry.toString(),
                    currentCount: 0,
                    hour: '04',
                    language: frenchLanguage.toString(),
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
            await useCase.execute(TEST_LANGUAGE, TEST_COUNTRY);

            // Then
            expect(mockLogger.warn).toHaveBeenCalledWith('No articles found', {
                country: TEST_COUNTRY.toString(),
                language: TEST_LANGUAGE.toString(),
            });
            expect(mockArticleGenerator.generateArticles).not.toHaveBeenCalled();
            expect(mockArticleRepository.createMany).not.toHaveBeenCalled();
        });

        it('should handle and re-throw errors during execution', async () => {
            // Given
            const testDate = new TZDate(2020, 0, 1, 14, 0, 0, 0, 'America/New_York');
            jest.setSystemTime(testDate);

            const testError = new Error('Test error');
            mockNewsService.fetchNews.mockRejectedValue(testError);

            // When/Then
            await expect(useCase.execute(TEST_LANGUAGE, TEST_COUNTRY)).rejects.toThrow(testError);

            expect(mockLogger.error).toHaveBeenCalledWith('Failed to generate articles', {
                country: TEST_COUNTRY.toString(),
                error: testError,
                language: TEST_LANGUAGE.toString(),
            });
        });
    });
});
