import { type LoggerPort } from '@jterrazz/logger';
import { beforeEach, describe, expect, mockOf, test } from '@jterrazz/test';
import { type DeepMockProxy, mock } from 'vitest-mock-extended';

import { getMockStories } from '../../../../domain/entities/__mocks__/mock-of-stories.js';
import { type Story } from '../../../../domain/entities/story.entity.js';
import { Category } from '../../../../domain/value-objects/category.vo.js';
import { Country } from '../../../../domain/value-objects/country.vo.js';
import { Language } from '../../../../domain/value-objects/language.vo.js';

import {
    type StoryDigestAgentPort,
    type StoryDigestResult,
} from '../../../ports/outbound/agents/story-digest.agent.js';
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
    let mockDigestResults: StoryDigestResult[];

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

        // Create mock digest results (partial data from AI with raw perspective data)
        mockDigestResults = testStories.map((story) => ({
            category: story.category,
            perspectives: story.perspectives.map((perspective) => ({
                holisticDigest: perspective.holisticDigest,
                tags: perspective.tags,
            })),
            synopsis: story.synopsis,
        }));

        // Default mock responses
        mockNewsProvider.fetchNews.mockResolvedValue(testNewsStories);
        // mockStoryDigestAgent.run is NOT mocked here; each test will define its own mock.
        mockStoryRepository.create.mockImplementation(async (story) => story);
        mockStoryRepository.getAllSourceReferences.mockResolvedValue([]);
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
                {
                    body: `Test article body ${i + 1} third article content with sufficient length`,
                    headline: `Test Headline ${i + 1} Third`,
                    id: `article-${i + 1}-3`,
                },
                {
                    body: `Test article body ${i + 1} fourth article content with sufficient length`,
                    headline: `Test Headline ${i + 1} Fourth`,
                    id: `article-${i + 1}-4`,
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
            mockStoryDigestAgent.run.mockImplementation(async (params) => {
                if (!params) return null;
                const index = testNewsStories.findIndex((s) => s === params.newsStory);
                return mockDigestResults[index];
            });

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
                        country: expect.any(Country),
                    }),
                ]),
            );
        });

        test('should filter out news stories with insufficient articles', async () => {
            // Given - a story with 1 article (which is insufficient)
            const insufficientStory: NewsStory = {
                    articles: [
                        {
                            body: 'Single article body',
                            headline: 'Single Headline',
                            id: 'single-article-1',
                        },
                ], // Only 1 article - insufficient (need >= 2)
                    publishedAt: new Date('2024-01-01T10:00:00Z'),
            };

            // And a story with 2 articles (which is sufficient)
            const sufficientStory: NewsStory = {
                articles: [
                    {
                        body: 'First article body',
                        headline: 'First Headline',
                        id: 'sufficient-article-1',
                    },
                    {
                        body: 'Second article body',
                        headline: 'Second Headline',
                        id: 'sufficient-article-2',
                    },
                ], // 2 articles - sufficient
                publishedAt: new Date('2024-01-02T10:00:00Z'),
            };

            mockNewsProvider.fetchNews.mockResolvedValue([insufficientStory, sufficientStory]);
            mockStoryDigestAgent.run.mockResolvedValue(mockDigestResults[0]);

            // When - executing the use case
            const result = await useCase.execute(DEFAULT_LANGUAGE, DEFAULT_COUNTRY);

            // Then - it should only process the valid story (the one with >= 2 articles)
            expect(mockStoryDigestAgent.run).toHaveBeenCalledTimes(1);
            expect(mockStoryDigestAgent.run).toHaveBeenCalledWith({ newsStory: sufficientStory });
            expect(result).toHaveLength(1);
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
            // Given - agent returns null for the first story
            mockStoryDigestAgent.run.mockImplementation(async (params) => {
                if (params?.newsStory === testNewsStories[0]) {
                    return null;
                }
                const index = testNewsStories.findIndex((s) => s === params?.newsStory);
                return mockDigestResults[index];
            });

            // When - executing the use case
            const result = await useCase.execute(DEFAULT_LANGUAGE, DEFAULT_COUNTRY);

            // Then - it should skip null stories and process valid ones
            expect(mockStoryDigestAgent.run).toHaveBeenCalledTimes(TEST_STORIES_COUNT);
            expect(mockStoryRepository.create).toHaveBeenCalledTimes(TEST_STORIES_COUNT - 1);
            expect(result).toHaveLength(TEST_STORIES_COUNT - 1);
        });

        test('should continue processing if individual story digestion fails', async () => {
            // Given - agent throws an error for the second story
            mockStoryDigestAgent.run.mockImplementation(async (params) => {
                if (params?.newsStory === testNewsStories[1]) {
                    throw new Error('Agent processing failed');
                }
                const index = testNewsStories.findIndex((s) => s === params?.newsStory);
                return mockDigestResults[index];
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
            // Given - story repository throws error on create
            mockStoryRepository.create.mockRejectedValue(new Error('Repository failed'));
            mockStoryDigestAgent.run.mockImplementation(async (params) => {
                if (!params) return null;
                const index = testNewsStories.findIndex((s) => s === params.newsStory);
                return mockDigestResults[index];
            });

            // When - executing the use case
            const result = await useCase.execute(DEFAULT_LANGUAGE, DEFAULT_COUNTRY);

            // Then - it should continue processing and return empty array
            expect(mockStoryDigestAgent.run).toHaveBeenCalledTimes(TEST_STORIES_COUNT);
            expect(mockStoryRepository.create).toHaveBeenCalledTimes(TEST_STORIES_COUNT);
            expect(result).toEqual([]);
        });

        test('should filter out stories with already processed articles', async () => {
            // Given - some articles have already been processed
            const existingSourceReferences = ['existing-article-1', 'existing-article-2'];
            mockStoryRepository.getAllSourceReferences.mockResolvedValue(existingSourceReferences);

            // Create news stories where some contain already processed articles
            const newsWithDuplicates: NewsStory[] = [
                {
                    articles: [
                        { body: 'New article 1', headline: 'New Headline 1', id: 'new-article-1' },
                        { body: 'New article 2', headline: 'New Headline 2', id: 'new-article-2' },
                        { body: 'New article 3', headline: 'New Headline 3', id: 'new-article-3' },
                        { body: 'New article 4', headline: 'New Headline 4', id: 'new-article-4' },
                    ],
                    publishedAt: new Date('2024-01-01T10:00:00Z'),
                },
                {
                    articles: [
                        {
                            body: 'Duplicate article',
                            headline: 'Duplicate Headline',
                            id: 'existing-article-1',
                        }, // Already processed
                        {
                            body: 'Another article',
                            headline: 'Another Headline',
                            id: 'another-article',
                        },
                        {
                            body: 'Third article',
                            headline: 'Third Headline',
                            id: 'third-article',
                        },
                        {
                            body: 'Fourth article',
                            headline: 'Fourth Headline',
                            id: 'fourth-article',
                        },
                    ],
                    publishedAt: new Date('2024-01-01T11:00:00Z'),
                },
                {
                    articles: [
                        {
                            body: 'Fresh article 1',
                            headline: 'Fresh Headline 1',
                            id: 'fresh-article-1',
                        },
                        {
                            body: 'Fresh article 2',
                            headline: 'Fresh Headline 2',
                            id: 'fresh-article-2',
                        },
                        {
                            body: 'Fresh article 3',
                            headline: 'Fresh Headline 3',
                            id: 'fresh-article-3',
                        },
                        {
                            body: 'Fresh article 4',
                            headline: 'Fresh Headline 4',
                            id: 'fresh-article-4',
                        },
                    ],
                    publishedAt: new Date('2024-01-01T12:00:00Z'),
                },
            ];

            mockNewsProvider.fetchNews.mockResolvedValue(newsWithDuplicates);
            mockStoryDigestAgent.run.mockResolvedValue(mockDigestResults[0]);

            // When - executing the use case
            const result = await useCase.execute(DEFAULT_LANGUAGE, DEFAULT_COUNTRY);

            // Then - it should filter out the story with already processed articles
            expect(mockStoryRepository.getAllSourceReferences).toHaveBeenCalledTimes(1);
            expect(mockStoryRepository.getAllSourceReferences).toHaveBeenCalledWith(
                DEFAULT_COUNTRY,
            );
            expect(mockStoryDigestAgent.run).toHaveBeenCalledTimes(2); // Only 2 new stories processed
            expect(mockStoryRepository.create).toHaveBeenCalledTimes(2);
            expect(result).toHaveLength(2);

            // Verify that the duplicate story was not processed
            const processedStories = mockStoryDigestAgent.run.mock.calls.map(
                (call) => call[0]?.newsStory,
            );
            expect(processedStories).not.toContainEqual(newsWithDuplicates[1]); // The duplicate story
        });
    });
});
