import { TZDate } from '@date-fns/tz';
import { type LoggerPort } from '@jterrazz/logger';
import { afterEach, beforeEach, describe, expect, it, mockOfDate, vi } from '@jterrazz/test';
import { type DeepMockProxy, mock } from 'vitest-mock-extended';

import { mockArticles } from '../../../../domain/entities/__mocks__/mock-of-articles.js';
import { type Article } from '../../../../domain/entities/article.entity.js';
import { Country } from '../../../../domain/value-objects/country.vo.js';
import { Language } from '../../../../domain/value-objects/language.vo.js';

import { type ArticleGeneratorPort } from '../../../ports/outbound/ai/article-generator.port.js';
import { type ArticleRepositoryPort } from '../../../ports/outbound/persistence/article-repository.port.js';
import { type NewsArticle, type NewsProviderPort } from '../../../ports/outbound/providers/news.port.js';

import { GenerateArticlesUseCase } from '../generate-articles.use-case.js';

describe('GenerateArticlesUseCase', () => {
    // Test constants
    const TEST_COUNTRY_US = new Country('us');
    const TEST_COUNTRY_FR = new Country('fr');
    const TEST_LANGUAGE_EN = new Language('en');
    const TEST_LANGUAGE_FR = new Language('fr');
    const TEST_ARTICLE_COUNT = 12;

    // Test fixtures
    let mockArticleGenerator: DeepMockProxy<ArticleGeneratorPort>;
    let mockArticleRepository: DeepMockProxy<ArticleRepositoryPort>;
    let mockLogger: DeepMockProxy<LoggerPort>;
    let mockNewsService: DeepMockProxy<NewsProviderPort>;
    let useCase: GenerateArticlesUseCase;

    let testNews: NewsArticle[];
    let testArticles: Article[];
    let testPublishedSummaries: Array<{ headline: string; summary: string }>;

    beforeEach(() => {
        // Initialize mocks
        mockArticleGenerator = mock<ArticleGeneratorPort>();
        mockArticleRepository = mock<ArticleRepositoryPort>();
        mockLogger = mock<LoggerPort>();
        mockNewsService = mock<NewsProviderPort>();

        // Create test data
        testNews = createTestNews(TEST_ARTICLE_COUNT);
        testArticles = mockArticles(TEST_ARTICLE_COUNT, TEST_COUNTRY_US, TEST_LANGUAGE_EN);
        testPublishedSummaries = createTestSummaries(TEST_ARTICLE_COUNT);

        // Setup default mock responses
        mockNewsService.fetchNews.mockResolvedValue(testNews);
        mockArticleRepository.findHeadlinesAndSummaries.mockResolvedValue(testPublishedSummaries);
        mockArticleRepository.countMany.mockResolvedValue(0);
        mockArticleGenerator.generateArticles.mockResolvedValue(testArticles);

        useCase = new GenerateArticlesUseCase(
            mockArticleGenerator,
            mockArticleRepository,
            mockLogger,
            mockNewsService,
        );
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
        mockOfDate.reset();
    });

    /**
     * Helper functions
     */
    function createTestNews(count: number): NewsArticle[] {
        return Array.from({ length: count }, (_, i) => ({
            body: `Summary of real news ${i + 1}`,
            coverage: 10,
            headline: `Real News ${i + 1}`,
            publishedAt: new Date(`2024-03-${String(i + 1).padStart(2, '0')}`),
        }));
    }

    function createTestSummaries(count: number): Array<{ headline: string; summary: string }> {
        return Array.from({ length: count }, (_, i) => ({
            headline: `Old Article ${i + 1}`,
            summary: `Old Article ${i + 1} from 2024-01-${String(i + 1).padStart(2, '0')}`,
        }));
    }

    function createDateAtHour(hour: number, timezone: string): Date {
        const now = new Date();
        return new TZDate(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            hour,
            0,
            0,
            0,
            timezone,
        );
    }

    function setupTimeAndGeneration(
        hour: number,
        timezone: string,
        existingCount: number,
        expectedToGenerate: number,
    ) {
        const testDate = createDateAtHour(hour, timezone);
        mockOfDate.set(testDate);
        mockArticleRepository.countMany.mockResolvedValue(existingCount);
        mockArticleGenerator.generateArticles.mockResolvedValue(
            testArticles.slice(0, expectedToGenerate),
        );
        return testDate;
    }

    function expectGenerationOccurred(expectedCount: number, country: Country, language: Language) {
        expect(mockArticleGenerator.generateArticles).toHaveBeenCalledTimes(1);
        expect(mockArticleRepository.createMany).toHaveBeenCalledTimes(1);
        expect(mockArticleRepository.createMany).toHaveBeenCalledWith(
            testArticles.slice(0, expectedCount),
        );
        expect(mockLogger.info).toHaveBeenCalledWith(
            `Starting article generation for ${country.toString()} in ${language.toString()}`,
        );
        expect(mockLogger.info).toHaveBeenCalledWith(
            'Successfully stored articles',
            expect.objectContaining({
                country: country.toString(),
                generatedCount: expectedCount,
                language: language.toString(),
            }),
        );
    }

    function expectNoGeneration() {
        expect(mockArticleGenerator.generateArticles).not.toHaveBeenCalled();
        expect(mockArticleRepository.createMany).not.toHaveBeenCalled();
    }

    describe('execute', () => {
        // Test data for time-based generation scenarios
        const timeScenarios = [
            { existingCount: 0, expectedToGenerate: 4, hour: 7 },
            { existingCount: 2, expectedToGenerate: 2, hour: 7 },
            { existingCount: 4, expectedToGenerate: 0, hour: 7 },
            { existingCount: 0, expectedToGenerate: 8, hour: 14 },
            { existingCount: 4, expectedToGenerate: 4, hour: 14 },
            { existingCount: 8, expectedToGenerate: 0, hour: 14 },
            { existingCount: 0, expectedToGenerate: 12, hour: 20 },
            { existingCount: 8, expectedToGenerate: 4, hour: 20 },
            { existingCount: 12, expectedToGenerate: 0, hour: 20 },
        ];

        it.each(timeScenarios)(
            'should generate correct number of articles based on time - $hour:00 with $existingCount existing (US)',
            async ({ existingCount, expectedToGenerate, hour }) => {
                // Given - specific time and existing article count for US
                setupTimeAndGeneration(hour, 'America/New_York', existingCount, expectedToGenerate);

                // When - executing the use case
                await useCase.execute(TEST_LANGUAGE_EN, TEST_COUNTRY_US);

                // Then - should generate correct number or skip if not needed
                if (expectedToGenerate > 0) {
                    expectGenerationOccurred(expectedToGenerate, TEST_COUNTRY_US, TEST_LANGUAGE_EN);
                } else {
                    expectNoGeneration();
                }
            },
        );

        it.each(timeScenarios)(
            'should generate correct number of articles based on time - $hour:00 with $existingCount existing (France)',
            async ({ existingCount, expectedToGenerate, hour }) => {
                // Given - specific time and existing article count for France
                setupTimeAndGeneration(hour, 'Europe/Paris', existingCount, expectedToGenerate);

                // When - executing the use case
                await useCase.execute(TEST_LANGUAGE_FR, TEST_COUNTRY_FR);

                // Then - should generate correct number or skip if not needed
                if (expectedToGenerate > 0) {
                    expectGenerationOccurred(expectedToGenerate, TEST_COUNTRY_FR, TEST_LANGUAGE_FR);
                } else {
                    expectNoGeneration();
                }
            },
        );

        it('should not generate articles before 6am (France)', async () => {
            // Given - time before 6am in France
            setupTimeAndGeneration(4, 'Europe/Paris', 0, 0);

            // When - executing the use case
            await useCase.execute(TEST_LANGUAGE_FR, TEST_COUNTRY_FR);

            // Then - should not generate any articles
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Starting article generation for fr in fr',
            );
            expect(mockLogger.info).toHaveBeenCalledWith(
                'No new articles needed at this time for fr in fr',
                expect.objectContaining({
                    currentCount: 0,
                    hour: '04',
                    targetCount: 0,
                }),
            );
            expectNoGeneration();
        });

        it('should handle case when no news articles are found', async () => {
            // Given - news service returns no articles
            setupTimeAndGeneration(7, 'America/New_York', 0, 4);
            mockNewsService.fetchNews.mockResolvedValue([]);

            // When - executing the use case
            await useCase.execute(TEST_LANGUAGE_EN, TEST_COUNTRY_US);

            // Then - should log warning and not generate articles
            expect(mockLogger.warn).toHaveBeenCalledWith('No articles found', expect.any(Object));
            expectNoGeneration();
        });

        it('should handle and re-throw errors during execution', async () => {
            // Given - error during news fetching
            setupTimeAndGeneration(7, 'America/New_York', 0, 4);
            const error = new Error('Network error');
            mockNewsService.fetchNews.mockRejectedValue(error);

            // When/Then - should throw the error
            await expect(useCase.execute(TEST_LANGUAGE_EN, TEST_COUNTRY_US)).rejects.toThrow(
                'Network error',
            );

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Failed to generate articles',
                expect.objectContaining({
                    country: TEST_COUNTRY_US.toString(),
                    error,
                    language: TEST_LANGUAGE_EN.toString(),
                }),
            );
        });
    });
});
