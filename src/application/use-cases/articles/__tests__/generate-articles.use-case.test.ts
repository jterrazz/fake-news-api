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

describe('GenerateArticlesUseCase', () => {
    // Mocks
    const mockArticleGenerator = mock<ArticleGeneratorPort>();
    const mockArticleRepository = mock<ArticleRepositoryPort>();
    const mockLogger = mock<LoggerPort>();
    const mockNewsService = mock<NewsPort>();

    // Test data
    const testCountry = ArticleCountry.create(CountryEnum.UnitedStates);
    const testLanguage = ArticleLanguage.create(LanguageEnum.English);

    const testNews: NewsArticle[] = [
        {
            publishedAt: new Date('2024-03-01'),
            summary: 'Summary of real news 1',
            title: 'Real News 1',
            url: 'https://example.com/1',
        },
        {
            publishedAt: new Date('2024-03-02'),
            summary: 'Summary of real news 2',
            title: 'Real News 2',
            url: 'https://example.com/2',
        },
    ];

    const testPublishedSummaries: string[] = [
        'Old Article 1 from 2024-01-01',
        'Old Article 2 from 2024-01-02',
    ];

    const testGeneratedArticles: Article[] = [
        Article.create({
            category: ArticleCategory.create('POLITICS'),
            content: ArticleContent.create(
                'This is a detailed article about political developments in the United States. ' +
                    'The content discusses various policy changes and their potential impacts on society. ' +
                    'Multiple perspectives are presented to provide a balanced view.',
            ),
            country: testCountry,
            createdAt: new Date(),
            fakeStatus: ArticleFakeStatus.createFake('AI-generated content for testing'),
            headline: ArticleHeadline.create('Generated Article 1'),
            language: testLanguage,
            summary: ArticleSummary.create('Summary of generated article 1'),
        }),
        Article.create({
            category: ArticleCategory.create('TECHNOLOGY'),
            content: ArticleContent.create(
                'This comprehensive technology article explores recent advancements in artificial intelligence. ' +
                    'It covers machine learning developments and their applications in various industries. ' +
                    'The impact on society is also discussed in detail.',
            ),
            country: testCountry,
            createdAt: new Date(),
            fakeStatus: ArticleFakeStatus.createFake('AI-generated content for testing'),
            headline: ArticleHeadline.create('Generated Article 2'),
            language: testLanguage,
            summary: ArticleSummary.create('Summary of generated article 2'),
        }),
    ];

    // System under test
    let useCase: GenerateArticlesUseCase;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

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
        mockArticleGenerator.generateArticles.mockResolvedValue(testGeneratedArticles);
    });

    describe('execute', () => {
        it('should successfully generate and store articles', async () => {
            // Given
            const expectedSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

            // When
            await useCase.execute(testLanguage, testCountry);

            // Then
            expect(mockLogger.info).toHaveBeenCalledWith('Starting article generation', {
                country: testCountry,
                language: testLanguage,
            });

            expect(mockNewsService.fetchNews).toHaveBeenCalledWith({
                country: testCountry,
                language: testLanguage,
            });

            expect(mockArticleRepository.findPublishedSummaries).toHaveBeenCalledWith({
                country: testCountry,
                language: testLanguage,
                since: expect.any(Date),
            });
            // Verify the since date is approximately 30 days ago
            const [findCallArgs] = mockArticleRepository.findPublishedSummaries.mock.calls[0];
            expect(findCallArgs.since.getTime()).toBeCloseTo(expectedSince.getTime(), -3);

            expect(mockArticleGenerator.generateArticles).toHaveBeenCalledWith({
                articles: {
                    news: testNews,
                    publicationHistory: testPublishedSummaries,
                },
                country: testCountry,
                language: testLanguage,
            });

            expect(mockArticleRepository.createMany).toHaveBeenCalledWith(testGeneratedArticles);

            expect(mockLogger.info).toHaveBeenCalledWith('Successfully stored articles', {
                country: testCountry,
                generatedCount: testGeneratedArticles.length,
                language: testLanguage,
            });
        });

        it('should handle case when no news articles are found', async () => {
            // Given
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
