import { beforeEach, describe, expect, it } from '@jterrazz/test';
import { type DeepMockProxy, mock } from 'vitest-mock-extended';

import { buildTestArticles } from '../../../../domain/entities/__mocks__/article.builder.js';
import { type Article } from '../../../../domain/entities/article.entity.js';
import {
    ArticleCategory,
    CategoryEnum,
} from '../../../../domain/value-objects/article-category.vo.js';
import {
    ArticleCountry,
    CountryEnum,
} from '../../../../domain/value-objects/article-country.vo.js';
import {
    ArticleLanguage,
    LanguageEnum,
} from '../../../../domain/value-objects/article-language.vo.js';

import { type ArticleRepositoryPort } from '../../../ports/outbound/persistence/article-repository.port.js';

import { GetArticlesUseCase } from '../get-articles.use-case.js';

describe('GetArticlesUseCase', () => {
    // Test fixtures
    const DEFAULT_LIMIT = 10;
    const TEST_ARTICLES_COUNT = 15;

    // Mocks setup
    let mockArticleRepository: DeepMockProxy<ArticleRepositoryPort>;
    let useCase: GetArticlesUseCase;
    let testArticles: Article[];

    beforeEach(() => {
        mockArticleRepository = mock<ArticleRepositoryPort>();
        useCase = new GetArticlesUseCase(mockArticleRepository);
        testArticles = buildTestArticles(
            TEST_ARTICLES_COUNT,
            ArticleCountry.create(CountryEnum.UnitedStates),
            ArticleLanguage.create(LanguageEnum.English),
        );

        // Default mock response
        mockArticleRepository.findMany.mockResolvedValue({
            items: testArticles,
            total: TEST_ARTICLES_COUNT,
        });
    });

    describe('execute', () => {
        it('should return paginated articles with default parameters', async () => {
            // Given
            const params = {
                language: LanguageEnum.English,
                limit: DEFAULT_LIMIT,
            };

            // When
            const result = await useCase.execute(params);

            // Then
            expect(mockArticleRepository.findMany).toHaveBeenCalledWith({
                category: undefined,
                country: ArticleCountry.create(CountryEnum.UnitedStates),
                cursor: undefined,
                language: ArticleLanguage.create(LanguageEnum.English),
                limit: DEFAULT_LIMIT,
            });

            expect(result).toEqual({
                items: testArticles.slice(0, DEFAULT_LIMIT),
                nextCursor: expect.any(String),
                total: TEST_ARTICLES_COUNT,
            });
        });

        it('should handle custom limit parameter', async () => {
            // Given
            const limit = 5;
            const params = {
                language: LanguageEnum.English,
                limit,
            };

            // When
            const result = await useCase.execute(params);

            // Then
            expect(mockArticleRepository.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ limit }),
            );
            expect(result.items).toHaveLength(limit);
        });

        it('should handle category filter', async () => {
            // Given
            const params = {
                category: CategoryEnum.Technology as CategoryEnum.Technology,
                language: LanguageEnum.English,
                limit: DEFAULT_LIMIT,
            };

            // When
            await useCase.execute(params);

            // Then
            expect(mockArticleRepository.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    category: ArticleCategory.create(params.category),
                }),
            );
        });

        it('should handle country filter', async () => {
            // Given
            const params = {
                country: CountryEnum.France,
                language: LanguageEnum.English,
                limit: DEFAULT_LIMIT,
            };

            // When
            await useCase.execute(params);

            // Then
            expect(mockArticleRepository.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    country: ArticleCountry.create(params.country),
                }),
            );
        });

        it('should handle language filter', async () => {
            // Given
            const params = {
                language: LanguageEnum.French,
                limit: DEFAULT_LIMIT,
            };

            // When
            await useCase.execute(params);

            // Then
            expect(mockArticleRepository.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    language: ArticleLanguage.create(params.language),
                }),
            );
        });

        it('should handle cursor-based pagination', async () => {
            // Given
            const firstPage = await useCase.execute({
                language: LanguageEnum.English,
                limit: DEFAULT_LIMIT,
            });

            // When
            await useCase.execute({
                cursor: firstPage.nextCursor!,
                language: LanguageEnum.English,
                limit: DEFAULT_LIMIT,
            });

            // Then
            expect(mockArticleRepository.findMany).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({
                    cursor: expect.any(Date),
                }),
            );
        });

        it('should return null nextCursor when no more pages', async () => {
            // Given
            mockArticleRepository.findMany.mockResolvedValue({
                items: testArticles.slice(0, 5),
                total: 5,
            });

            // When
            const result = await useCase.execute({
                language: LanguageEnum.English,
                limit: DEFAULT_LIMIT,
            });

            // Then
            expect(result.nextCursor).toBeNull();
        });

        it('should throw error for invalid cursor', async () => {
            // Given
            const params = {
                cursor: 'invalid-cursor',
                language: LanguageEnum.English,
                limit: DEFAULT_LIMIT,
            };

            // When/Then
            await expect(useCase.execute(params)).rejects.toThrow('Invalid cursor');
        });

        it('should throw error for invalid limit', async () => {
            // Given
            const params = {
                language: LanguageEnum.English,
                limit: 1000, // Exceeds MAX_PAGE_SIZE
            };

            // When/Then
            await expect(useCase.execute(params)).rejects.toThrow('Invalid pagination parameters');
        });

        it('should throw error for invalid category', async () => {
            // Given
            const params = {
                category: 'invalid' as CategoryEnum.Politics,
                language: LanguageEnum.English,
                limit: DEFAULT_LIMIT,
            };

            // When/Then
            await expect(useCase.execute(params)).rejects.toThrow('Invalid pagination parameters');
        });
    });
});
