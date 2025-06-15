import { beforeEach, describe, expect, it } from '@jterrazz/test';
import { type DeepMockProxy, mock } from 'vitest-mock-extended';

import { mockArticles } from '../../../../domain/entities/__mocks__/mock-of-articles.js';
import { type Article } from '../../../../domain/entities/article.entity.js';
import { Category } from '../../../../domain/value-objects/category.vo.js';
import { Country } from '../../../../domain/value-objects/country.vo.js';
import { Language } from '../../../../domain/value-objects/language.vo.js';

import { type ArticleRepositoryPort } from '../../../ports/outbound/persistence/article-repository.port.js';

import { GetArticlesUseCase } from '../get-articles.use-case.js';

describe('GetArticlesUseCase', () => {
    // Test fixtures
    const DEFAULT_LIMIT = 10;
    const TEST_ARTICLES_COUNT = 20;

    // Mocks setup
    let mockArticleRepository: DeepMockProxy<ArticleRepositoryPort>;
    let useCase: GetArticlesUseCase;
    let testArticles: Article[];

    beforeEach(() => {
        mockArticleRepository = mock<ArticleRepositoryPort>();
        useCase = new GetArticlesUseCase(mockArticleRepository);
        testArticles = mockArticles(TEST_ARTICLES_COUNT, new Country('us'), new Language('en'));

        // Default mock response
        mockArticleRepository.findMany.mockResolvedValue({
            items: testArticles,
            total: TEST_ARTICLES_COUNT,
        });
    });

    describe('execute', () => {
        it('should return paginated articles with default parameters', async () => {
            // Given - a set of articles in the repository
            const params = {
                country: new Country('us'),
                language: new Language('en'),
                limit: DEFAULT_LIMIT,
            };

            // When - calling the use case with default parameters
            const result = await useCase.execute(params);

            // Then - it should return paginated articles
            expect(mockArticleRepository.findMany).toHaveBeenCalledWith({
                category: undefined,
                country: new Country('us'),
                cursor: undefined,
                language: new Language('en'),
                limit: DEFAULT_LIMIT,
            });

            expect(result).toEqual({
                items: testArticles.slice(0, DEFAULT_LIMIT),
                lastItemDate: expect.any(Date),
                total: TEST_ARTICLES_COUNT,
            });
        });

        it('should handle custom limit parameter', async () => {
            // Given - a custom limit parameter
            const limit = 5;
            const params = {
                country: new Country('us'),
                language: new Language('en'),
                limit,
            };

            // When - executing the use case with the custom limit
            const result = await useCase.execute(params);

            // Then - it should return the correct number of articles
            expect(mockArticleRepository.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ limit }),
            );
            expect(result.items).toHaveLength(limit);
        });

        it('should handle category filter', async () => {
            // Given - a category filter parameter
            const params = {
                category: new Category('technology'),
                country: new Country('us'),
                language: new Language('en'),
                limit: DEFAULT_LIMIT,
            };

            // When - executing the use case with the category filter
            await useCase.execute(params);

            // Then - it should call the repository with the correct category
            expect(mockArticleRepository.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    category: new Category('technology'),
                }),
            );
        });

        it('should handle country filter', async () => {
            // Given - a country filter parameter
            const params = {
                country: new Country('fr'),
                language: new Language('en'),
                limit: DEFAULT_LIMIT,
            };

            // When - executing the use case with the country filter
            await useCase.execute(params);

            // Then - it should call the repository with the correct country
            expect(mockArticleRepository.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    country: new Country('fr'),
                }),
            );
        });

        it('should handle language filter', async () => {
            // Given - a language filter parameter
            const params = {
                country: new Country('us'),
                language: new Language('fr'),
                limit: DEFAULT_LIMIT,
            };

            // When - executing the use case with the language filter
            await useCase.execute(params);

            // Then - it should call the repository with the correct language
            expect(mockArticleRepository.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    language: new Language('fr'),
                }),
            );
        });

        it('should handle cursor-based pagination', async () => {
            // Given - a first page of results and a cursor date
            const cursorDate = new Date('2024-01-01T10:00:00Z');
            const firstPage = await useCase.execute({
                country: new Country('us'),
                language: new Language('en'),
                limit: DEFAULT_LIMIT,
            });

            // When - requesting the next page using the cursor
            await useCase.execute({
                country: new Country('us'),
                cursor: cursorDate,
                language: new Language('en'),
                limit: DEFAULT_LIMIT,
            });

            // Then - it should call the repository with the correct cursor
            expect(mockArticleRepository.findMany).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({
                    cursor: cursorDate,
                }),
            );
        });

        it('should return null nextCursor when no more pages', async () => {
            // Given - a repository response with fewer items than the page size
            mockArticleRepository.findMany.mockResolvedValue({
                items: testArticles.slice(0, 5),
                total: 5,
            });

            // When - executing the use case
            const result = await useCase.execute({
                country: new Country('us'),
                language: new Language('en'),
                limit: DEFAULT_LIMIT,
            });

            // Then - it should return null for lastItemDate
            expect(result.lastItemDate).toBeNull();
        });
    });
});
