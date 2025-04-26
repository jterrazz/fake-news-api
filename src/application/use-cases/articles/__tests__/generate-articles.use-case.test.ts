import { type LoggerPort } from '@jterrazz/logger';
import { type DeepMockProxy, mock } from 'jest-mock-extended';

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
import { type ArticleRepositoryPort } from '../../../ports/outbound/persistence/article-repository.port.js';

import { TZDate } from '../../../../shared/date/timezone.js';
import { GenerateArticlesUseCase } from '../generate-articles.use-case.js';

describe('GenerateArticlesUseCase', () => {
    const createTestNews = (count: number): NewsArticle[] =>
        Array.from({ length: count }, (_, i) => ({
            publishedAt: new Date(`2024-03-${String(i + 1).padStart(2, '0')}`),
            text: `Summary of real news ${i + 1}`,
            title: `Real News ${i + 1}`,
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
                summary: ArticleSummary.create(`Summary of generated article ${i + 1}`.repeat(10)),
            }),
        );

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

    const TEST_COUNTRY = ArticleCountry.create(CountryEnum.UnitedStates);
    const TEST_LANGUAGE = ArticleLanguage.create(LanguageEnum.English);
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
        testArticles = createTestArticles(TEST_ARTICLE_COUNT, TEST_COUNTRY, TEST_LANGUAGE);
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
            async ({ existingCount, expectedToGenerate, hour }) => {
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
            { existingCount: 4, expectedToGenerate: 4, hour: 14 },
            { existingCount: 6, expectedToGenerate: 2, hour: 14 },
            { existingCount: 8, expectedToGenerate: 4, hour: 18 },
            { existingCount: 10, expectedToGenerate: 2, hour: 18 },
            { existingCount: 0, expectedToGenerate: 12, hour: 18 },
        ])(
            'should generate correct number of articles based on time - $hour:00 with $existingCount existing (France)',
            async ({ existingCount, expectedToGenerate, hour }) => {
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
            // Given
            const testDate = createDateAtHour(4, 'Europe/Paris');
            jest.setSystemTime(testDate);
            const frenchCountry = ArticleCountry.create(CountryEnum.France);
            const frenchLanguage = ArticleLanguage.create(LanguageEnum.French);

            // When
            await useCase.execute(frenchLanguage, frenchCountry);

            // Then
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Starting article generation for fr in fr',
            );
            expect(mockLogger.info).toHaveBeenCalledWith(
                'No new articles needed at this time for fr in fr',
                expect.objectContaining({
                    currentCount: 0,
                    hour: '04',
                    targetCount: 0,
                    timezone: 'Europe/Paris',
                }),
            );
            expect(mockArticleGenerator.generateArticles).not.toHaveBeenCalled();
            expect(mockArticleRepository.createMany).not.toHaveBeenCalled();
        });

        it('should handle case when no news articles are found', async () => {
            // Given
            const testDate = createDateAtHour(7, 'America/New_York');
            jest.setSystemTime(testDate);
            mockNewsService.fetchTopNews.mockResolvedValue([]);

            // When
            await useCase.execute(TEST_LANGUAGE, TEST_COUNTRY);

            // Then
            expect(mockLogger.warn).toHaveBeenCalledWith('No articles found', expect.any(Object));
            expect(mockArticleGenerator.generateArticles).not.toHaveBeenCalled();
            expect(mockArticleRepository.createMany).not.toHaveBeenCalled();
        });

        it('should handle and re-throw errors during execution', async () => {
            // Given
            const testDate = new TZDate(2020, 0, 1, 14, 0, 0, 0, 'America/New_York');
            jest.setSystemTime(testDate);
            const testError = new Error('Test error');
            mockNewsService.fetchTopNews.mockRejectedValue(testError);

            // When/Then
            await expect(useCase.execute(TEST_LANGUAGE, TEST_COUNTRY)).rejects.toThrow(testError);

            // Then
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
