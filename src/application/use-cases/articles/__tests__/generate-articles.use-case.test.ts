import { TZDate } from '@date-fns/tz';
import { type LoggerPort } from '@jterrazz/logger';
import { afterEach, beforeEach, describe, expect, it, mockOfDate, vi } from '@jterrazz/test';
import { type DeepMockProxy, mock } from 'vitest-mock-extended';

import { buildTestArticles } from '../../../../domain/entities/__mocks__/article.builder.js';
import { type Article } from '../../../../domain/entities/article.entity.js';
import { Country } from '../../../../domain/value-objects/country.vo.js';
import { Language } from '../../../../domain/value-objects/language.vo.js';

import { type ArticleGeneratorPort } from '../../../ports/outbound/ai/article-generator.port.js';
import { type NewsArticle, type NewsPort } from '../../../ports/outbound/data-sources/news.port.js';
import { type ArticleRepositoryPort } from '../../../ports/outbound/persistence/article-repository.port.js';

import { GenerateArticlesUseCase } from '../generate-articles.use-case.js';

describe('GenerateArticlesUseCase', () => {
    const createTestNews = (count: number): NewsArticle[] =>
        Array.from({ length: count }, (_, i) => ({
            publishedAt: new Date(`2024-03-${String(i + 1).padStart(2, '0')}`),
            publishedCount: 10,
            text: `Summary of real news ${i + 1}`,
            title: `Real News ${i + 1}`,
        }));

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

    const TEST_COUNTRY = Country.create('us');
    const TEST_LANGUAGE = Language.create('en');
    const TEST_ARTICLE_COUNT = 12;

    let mockArticleGenerator: DeepMockProxy<ArticleGeneratorPort>;
    let mockArticleRepository: DeepMockProxy<ArticleRepositoryPort>;
    let mockLogger: DeepMockProxy<LoggerPort>;
    let mockNewsService: DeepMockProxy<NewsPort>;
    let useCase: GenerateArticlesUseCase;

    let testNews: NewsArticle[];
    let testArticles: Article[];
    let testPublishedSummaries: string[];

    beforeEach(() => {
        mockArticleGenerator = mock<ArticleGeneratorPort>();
        mockArticleRepository = mock<ArticleRepositoryPort>();
        mockLogger = mock<LoggerPort>();
        mockNewsService = mock<NewsPort>();

        testNews = createTestNews(TEST_ARTICLE_COUNT);
        testArticles = buildTestArticles(TEST_ARTICLE_COUNT, TEST_COUNTRY, TEST_LANGUAGE);
        testPublishedSummaries = Array.from(
            { length: TEST_ARTICLE_COUNT },
            (_, i) => `Old Article ${i + 1} from 2024-01-${String(i + 1).padStart(2, '0')}`,
        );

        mockNewsService.fetchTopNews.mockResolvedValue(testNews);
        mockArticleRepository.findPublishedSummaries.mockResolvedValue(
            testPublishedSummaries.map((summary) => ({
                headline: summary,
                summary: summary,
            })),
        );
        mockArticleRepository.countManyForDay.mockResolvedValue(0);
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

    describe('execute', () => {
        it.each([
            { existingCount: 0, expectedToGenerate: 4, hour: 7 },
            { existingCount: 2, expectedToGenerate: 2, hour: 7 },
            { existingCount: 4, expectedToGenerate: 0, hour: 7 },
            { existingCount: 0, expectedToGenerate: 8, hour: 14 },
            { existingCount: 4, expectedToGenerate: 4, hour: 14 },
            { existingCount: 8, expectedToGenerate: 0, hour: 14 },
            { existingCount: 0, expectedToGenerate: 12, hour: 20 },
            { existingCount: 8, expectedToGenerate: 4, hour: 20 },
            { existingCount: 12, expectedToGenerate: 0, hour: 20 },
        ])(
            'should generate correct number of articles based on time - $hour:00 with $existingCount existing (US)',
            async ({ existingCount, expectedToGenerate, hour }) => {
                // Given - a specific hour and existing article count for the US
                const testDate = createDateAtHour(hour, 'America/New_York');
                mockOfDate.set(testDate);
                mockArticleRepository.countManyForDay.mockResolvedValue(existingCount);
                mockArticleGenerator.generateArticles.mockResolvedValue(
                    testArticles.slice(0, expectedToGenerate),
                );

                // When - executing the use case
                await useCase.execute(TEST_LANGUAGE, TEST_COUNTRY);

                // Then - it should generate and store the correct number of articles, or none if not needed
                if (expectedToGenerate > 0) {
                    expect(mockArticleGenerator.generateArticles).toHaveBeenCalledTimes(1);
                    expect(mockArticleRepository.createMany).toHaveBeenCalledTimes(1);
                    expect(mockArticleRepository.createMany).toHaveBeenCalledWith(
                        testArticles.slice(0, expectedToGenerate),
                    );
                    expect(mockLogger.info).toHaveBeenCalledWith(
                        `Starting article generation for ${TEST_COUNTRY.toString()} in ${TEST_LANGUAGE.toString()}`,
                    );
                    expect(mockLogger.info).toHaveBeenCalledWith(
                        'Successfully stored articles',
                        expect.objectContaining({
                            country: TEST_COUNTRY.toString(),
                            generatedCount: expectedToGenerate,
                            language: TEST_LANGUAGE.toString(),
                        }),
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
            { existingCount: 4, expectedToGenerate: 0, hour: 7 },
            { existingCount: 0, expectedToGenerate: 8, hour: 14 },
            { existingCount: 4, expectedToGenerate: 4, hour: 14 },
            { existingCount: 8, expectedToGenerate: 0, hour: 14 },
            { existingCount: 0, expectedToGenerate: 12, hour: 20 },
            { existingCount: 8, expectedToGenerate: 4, hour: 20 },
            { existingCount: 12, expectedToGenerate: 0, hour: 20 },
        ])(
            'should generate correct number of articles based on time - $hour:00 with $existingCount existing (France)',
            async ({ existingCount, expectedToGenerate, hour }) => {
                // Given - a specific hour and existing article count for France
                const testDate = createDateAtHour(hour, 'Europe/Paris');
                mockOfDate.set(testDate);
                const frenchCountry = Country.create('fr');
                const frenchLanguage = Language.create('fr');
                mockArticleRepository.countManyForDay.mockResolvedValue(existingCount);
                mockArticleGenerator.generateArticles.mockResolvedValue(
                    testArticles.slice(0, expectedToGenerate),
                );

                // When - executing the use case
                await useCase.execute(frenchLanguage, frenchCountry);

                // Then - it should generate and store the correct number of articles, or none if not needed
                if (expectedToGenerate > 0) {
                    expect(mockArticleGenerator.generateArticles).toHaveBeenCalledTimes(1);
                    expect(mockArticleRepository.createMany).toHaveBeenCalledTimes(1);
                    expect(mockArticleRepository.createMany).toHaveBeenCalledWith(
                        testArticles.slice(0, expectedToGenerate),
                    );
                    expect(mockLogger.info).toHaveBeenCalledWith(
                        `Starting article generation for ${frenchCountry.toString()} in ${frenchLanguage.toString()}`,
                    );
                    expect(mockLogger.info).toHaveBeenCalledWith(
                        'Successfully stored articles',
                        expect.objectContaining({
                            country: frenchCountry.toString(),
                            generatedCount: expectedToGenerate,
                            language: frenchLanguage.toString(),
                        }),
                    );
                } else {
                    expect(mockArticleGenerator.generateArticles).not.toHaveBeenCalled();
                    expect(mockArticleRepository.createMany).not.toHaveBeenCalled();
                }
            },
        );

        it('should not generate articles before 6am (France)', async () => {
            // Given - a time before 6am in France
            const testDate = createDateAtHour(4, 'Europe/Paris');
            mockOfDate.set(testDate);
            const frenchCountry = Country.create('fr');
            const frenchLanguage = Language.create('fr');

            // When - executing the use case
            await useCase.execute(frenchLanguage, frenchCountry);

            // Then - it should not generate any articles
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
            expect(mockArticleGenerator.generateArticles).not.toHaveBeenCalled();
            expect(mockArticleRepository.createMany).not.toHaveBeenCalled();
        });

        it('should handle case when no news articles are found', async () => {
            // Given - the news service returns no articles
            const testDate = createDateAtHour(7, 'America/New_York');
            mockOfDate.set(testDate);
            mockNewsService.fetchTopNews.mockResolvedValue([]);

            // When - executing the use case
            await useCase.execute(TEST_LANGUAGE, TEST_COUNTRY);

            // Then - it should log a warning and not generate or store articles
            expect(mockLogger.warn).toHaveBeenCalledWith('No articles found', expect.any(Object));
            expect(mockArticleGenerator.generateArticles).not.toHaveBeenCalled();
            expect(mockArticleRepository.createMany).not.toHaveBeenCalled();
        });

        it('should handle and re-throw errors during execution', async () => {
            // Given - the news service throws an error
            const testDate = new TZDate(2020, 0, 1, 14, 0, 0, 0, 'America/New_York');
            mockOfDate.set(testDate);
            const testError = new Error('Test error');
            mockNewsService.fetchTopNews.mockRejectedValue(testError);

            // When/Then - executing the use case should throw the error and log it
            await expect(useCase.execute(TEST_LANGUAGE, TEST_COUNTRY)).rejects.toThrow(testError);

            // Then - it should log the error
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Failed to generate articles',
                expect.objectContaining({
                    country: TEST_COUNTRY.toString(),
                    error: testError,
                    language: TEST_LANGUAGE.toString(),
                }),
            );
        });
    });
});
