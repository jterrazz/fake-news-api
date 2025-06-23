import { type LoggerPort } from '@jterrazz/logger';
import { beforeEach, describe, expect, mockOf, test } from '@jterrazz/test';
import { type DeepMockProxy, mock } from 'vitest-mock-extended';

import { getMockStories } from '../../../../domain/entities/__mocks__/mock-of-stories.js';
import { type Story } from '../../../../domain/entities/story.entity.js';
import { Category } from '../../../../domain/value-objects/category.vo.js';
import { Country } from '../../../../domain/value-objects/country.vo.js';
import { Language } from '../../../../domain/value-objects/language.vo.js';

import { type StoryDigestAgentPort } from '../../../ports/outbound/agents/story-digest.agent.js';
import { type StoryRepositoryPort } from '../../../ports/outbound/persistence/story-repository.port.js';
import {
    type NewsProviderPort,
    type NewsStory,
} from '../../../ports/outbound/providers/news.port.js';

import { DigestStoriesUseCase } from '../digest-stories.use-case.js';

describe('DigestStoriesUseCase', () => {
    // Test constants
    const DEFAULT_COUNTRY = new Country('us');
    const DEFAULT_LANGUAGE = new Language('en');
    const TEST_STORIES_COUNT = 3;

    // Test fixtures
    let mockStoryDigestAgent: DeepMockProxy<StoryDigestAgentPort>;
    let mockLogger: DeepMockProxy<LoggerPort>;
    let mockNewsProvider: DeepMockProxy<NewsProviderPort>;
    let mockStoryRepository: DeepMockProxy<StoryRepositoryPort>;
    let useCase: DigestStoriesUseCase;
    let testStories: Story[];
    let testNewsStories: NewsStory[];

    beforeEach(() => {
        mockStoryDigestAgent = mock<StoryDigestAgentPort>();
        mockLogger = mockOf<LoggerPort>();
        mockNewsProvider = mock<NewsProviderPort>();
        mockStoryRepository = mock<StoryRepositoryPort>();

        useCase = new DigestStoriesUseCase(
            mockStoryDigestAgent,
            mockLogger,
            mockNewsProvider,
            mockStoryRepository,
        );

        testStories = getMockStories(TEST_STORIES_COUNT);
        testNewsStories = createTestNewsStories(TEST_STORIES_COUNT);

        // Default mock responses
        mockNewsProvider.fetchNews.mockResolvedValue(testNewsStories);
        mockStoryDigestAgent.run.mockImplementation(async () => testStories[0]);
        mockStoryRepository.create.mockImplementation(async (story) => story);
    });

    /**
     * Helper to create test news stories
     */
    const createTestNewsStories = (count: number): NewsStory[] => {
        return Array.from({ length: count }, (_, i) => ({
            articles: [
                {
                    body: `Test article body ${i + 1} content with sufficient length for processing`,
                    headline: `Test Headline ${i + 1}`,
                    id: `article-${i + 1}-1`,
                },
                {
                    body: `Test article body ${i + 1} second article content with sufficient length`,
                    headline: `Test Headline ${i + 1} Second`,
                    id: `article-${i + 1}-2`,
                },
            ],
            publishedAt: new Date(`2024-01-0${i + 1}T10:00:00Z`),
        }));
    };

    describe('execute', () => {
        test('should digest stories successfully with valid news data', async () => {
            // Given - valid country and language parameters
            const country = DEFAULT_COUNTRY;
            const language = DEFAULT_LANGUAGE;

            // When - executing the use case
            const result = await useCase.execute(language, country);

            // Then - it should fetch news from provider
            expect(mockNewsProvider.fetchNews).toHaveBeenCalledWith({
                country,
                language,
            });

            // And process each valid news story through the agent
            expect(mockStoryDigestAgent.run).toHaveBeenCalledTimes(TEST_STORIES_COUNT);
            testNewsStories.forEach((newsStory) => {
                expect(mockStoryDigestAgent.run).toHaveBeenCalledWith({
                    newsStory,
                });
            });

            // And save each digested story to repository
            expect(mockStoryRepository.create).toHaveBeenCalledTimes(TEST_STORIES_COUNT);

            // And return the digested stories
            expect(result).toHaveLength(TEST_STORIES_COUNT);
            expect(result).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        category: expect.any(Category),
                        countries: expect.any(Array),
                    }),
                ]),
            );
        });

        test('should filter out news stories with insufficient articles', async () => {
            // Given - news stories with insufficient article count
            const insufficientNewsStories: NewsStory[] = [
                {
                    articles: [
                        {
                            body: 'Single article body',
                            headline: 'Single Headline',
                            id: 'single-article-1',
                        },
                    ],
                    publishedAt: new Date('2024-01-01T10:00:00Z'),
                },
                ...testNewsStories, // Valid stories
            ];
            mockNewsProvider.fetchNews.mockResolvedValue(insufficientNewsStories);

            // When - executing the use case
            const result = await useCase.execute(DEFAULT_LANGUAGE, DEFAULT_COUNTRY);

            // Then - it should only process valid stories
            expect(mockStoryDigestAgent.run).toHaveBeenCalledTimes(TEST_STORIES_COUNT);
            expect(result).toHaveLength(TEST_STORIES_COUNT);
        });

        test('should handle empty news provider response', async () => {
            // Given - no news stories from provider
            mockNewsProvider.fetchNews.mockResolvedValue([]);

            // When - executing the use case
            const result = await useCase.execute(DEFAULT_LANGUAGE, DEFAULT_COUNTRY);

            // Then - it should return empty array without calling agent or repository
            expect(mockStoryDigestAgent.run).not.toHaveBeenCalled();
            expect(mockStoryRepository.create).not.toHaveBeenCalled();
            expect(result).toEqual([]);
        });

        test('should handle null response from story digest agent', async () => {
            // Given - agent returns null for some stories
            mockStoryDigestAgent.run.mockImplementation(async (params) => {
                // Return null for first story, valid story for others
                return params?.newsStory === testNewsStories[0] ? null : testStories[0];
            });

            // When - executing the use case
            const result = await useCase.execute(DEFAULT_LANGUAGE, DEFAULT_COUNTRY);

            // Then - it should skip null stories and process valid ones
            expect(mockStoryDigestAgent.run).toHaveBeenCalledTimes(TEST_STORIES_COUNT);
            expect(mockStoryRepository.create).toHaveBeenCalledTimes(TEST_STORIES_COUNT - 1);
            expect(result).toHaveLength(TEST_STORIES_COUNT - 1);
        });

        test('should continue processing if individual story digestion fails', async () => {
            // Given - agent throws error for one story
            mockStoryDigestAgent.run.mockImplementation(async (params) => {
                if (params?.newsStory === testNewsStories[1]) {
                    throw new Error('Agent processing failed');
                }
                return testStories[0];
            });

            // When - executing the use case
            const result = await useCase.execute(DEFAULT_LANGUAGE, DEFAULT_COUNTRY);

            // Then - it should continue processing other stories
            expect(mockStoryDigestAgent.run).toHaveBeenCalledTimes(TEST_STORIES_COUNT);
            expect(mockStoryRepository.create).toHaveBeenCalledTimes(TEST_STORIES_COUNT - 1);
            expect(result).toHaveLength(TEST_STORIES_COUNT - 1);
        });

        test('should handle different countries and languages', async () => {
            // Given - different country and language
            const country = new Country('fr');
            const language = new Language('fr');

            // When - executing the use case
            await useCase.execute(language, country);

            // Then - it should pass correct parameters to news provider
            expect(mockNewsProvider.fetchNews).toHaveBeenCalledWith({
                country,
                language,
            });
        });

        test('should throw error when news provider fails', async () => {
            // Given - news provider throws error
            const providerError = new Error('News provider failed');
            mockNewsProvider.fetchNews.mockRejectedValue(providerError);

            // When - executing the use case
            // Then - it should throw the error
            await expect(useCase.execute(DEFAULT_LANGUAGE, DEFAULT_COUNTRY)).rejects.toThrow(
                'News provider failed',
            );

            expect(mockStoryDigestAgent.run).not.toHaveBeenCalled();
            expect(mockStoryRepository.create).not.toHaveBeenCalled();
        });

        test('should continue processing when story repository fails', async () => {
            // Given - repository throws error for all stories
            const repositoryError = new Error('Repository save failed');
            mockStoryRepository.create.mockRejectedValue(repositoryError);

            // When - executing the use case
            const result = await useCase.execute(DEFAULT_LANGUAGE, DEFAULT_COUNTRY);

            // Then - it should continue processing and return empty array
            expect(mockStoryDigestAgent.run).toHaveBeenCalledTimes(TEST_STORIES_COUNT);
            expect(mockStoryRepository.create).toHaveBeenCalledTimes(TEST_STORIES_COUNT);
            expect(result).toEqual([]);
        });
    });
});
