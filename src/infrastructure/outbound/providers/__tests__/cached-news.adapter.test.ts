import { type LoggerPort } from '@jterrazz/logger';
import { beforeEach, describe, expect, mockOf, test } from '@jterrazz/test';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { vi } from 'vitest';
import { type Mock } from 'vitest';

import {
    type NewsProviderPort,
    type NewsStory,
} from '../../../../application/ports/outbound/providers/news.port.js';

import { Country } from '../../../../domain/value-objects/country.vo.js';
import { Language } from '../../../../domain/value-objects/language.vo.js';

import { CachedNewsAdapter } from '../cached-news.adapter.js';

// Mock node fs operations
vi.mock('node:fs');

describe('CachedNewsAdapter', () => {
    // Given
    const mockNewsSource = mockOf<NewsProviderPort>();
    const mockLogger = mockOf<LoggerPort>();
    const cacheDirectory = 'test';

    const options = {
        country: new Country('us'),
        language: new Language('en'),
    };

    const mockStory: NewsStory = {
        articles: [
            {
                body: 'Test summary',
                headline: 'Test title',
                id: 'test-article-1',
                publishedAt: new Date('2024-03-08T00:00:00.000Z'),
            },
        ],
        publishedAt: new Date('2024-03-08T00:00:00.000Z'),
    };

    let adapter: CachedNewsAdapter;

    beforeEach(() => {
        vi.clearAllMocks();
        adapter = new CachedNewsAdapter(mockNewsSource, mockLogger, cacheDirectory);
    });

    describe('fetchNews', () => {
        test('should return cached data when valid cache exists', async () => {
            // Given - a valid cache exists for the requested data
            const validCache = {
                data: [mockStory],
                timestamp: Date.now(),
            };
            (existsSync as Mock).mockReturnValue(true);
            (readFileSync as Mock).mockReturnValue(JSON.stringify(validCache));

            // When - fetching data from the adapter
            const result = await adapter.fetchNews(options);

            // Then - it should return the cached data
            expect(result).toEqual([mockStory]);
            expect(mockNewsSource.fetchNews).not.toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith('Cache hit - using cached news data', {
                cacheAge: expect.any(Number),
                language: 'en',
                storyCount: 1,
            });
        });

        test('should fetch fresh data when cache is expired', async () => {
            // Given - a cache that is expired (older than allowed)
            const expiredCache = {
                data: [mockStory],
                timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours old
            };
            (existsSync as Mock).mockReturnValue(true);
            (readFileSync as Mock).mockReturnValue(JSON.stringify(expiredCache));
            mockNewsSource.fetchNews.mockResolvedValue([mockStory]);

            // When - fetching data from the adapter
            const result = await adapter.fetchNews(options);

            // Then - it should fetch fresh data and update the cache
            expect(result).toEqual([mockStory]);
            expect(mockNewsSource.fetchNews).toHaveBeenCalledWith(options);
            expect(mockLogger.info).toHaveBeenCalledWith('Cache miss - fetching fresh news data', {
                language: 'en',
            });
            expect(writeFileSync).toHaveBeenCalledWith(
                expect.stringContaining(`${cacheDirectory}/stories/en.json`),
                expect.any(String),
            );
        });

        test('should fetch fresh data when cache does not exist', async () => {
            // Given - no cache exists for the requested data
            (existsSync as Mock).mockReturnValue(false);
            mockNewsSource.fetchNews.mockResolvedValue([mockStory]);

            // When - fetching data from the adapter
            const result = await adapter.fetchNews(options);

            // Then - it should fetch fresh data and return it
            expect(result).toEqual([mockStory]);
            expect(mockNewsSource.fetchNews).toHaveBeenCalledWith(options);
            expect(mockLogger.info).toHaveBeenCalledWith('Cache miss - fetching fresh news data', {
                language: 'en',
            });
        });

        describe('error handling', () => {
            test('should fallback to fresh data when cache read fails', async () => {
                // Given - reading the cache throws an error
                (existsSync as Mock).mockReturnValue(true);
                (readFileSync as Mock).mockImplementation(() => {
                    throw new Error('Read error');
                });
                mockNewsSource.fetchNews.mockResolvedValue([mockStory]);

                // When - fetching data from the adapter
                const result = await adapter.fetchNews(options);

                // Then - it should fetch fresh data and log the cache read error
                expect(result).toEqual([mockStory]);
                expect(mockLogger.error).toHaveBeenCalledWith(
                    'Failed to read news cache, removing corrupted cache',
                    {
                        cachePath: expect.stringContaining(`${cacheDirectory}/stories/en.json`),
                        error: expect.any(Error),
                        language: 'en',
                    },
                );
                expect(mockNewsSource.fetchNews).toHaveBeenCalledWith(options);
            });

            test('should return data even when cache write fails', async () => {
                // Given - writing to the cache throws an error
                (existsSync as Mock).mockReturnValue(false);
                (writeFileSync as Mock).mockImplementation(() => {
                    throw new Error('Write error');
                });
                mockNewsSource.fetchNews.mockResolvedValue([mockStory]);

                // When - fetching data from the adapter
                const result = await adapter.fetchNews(options);

                // Then - it should return the data and log the cache write error
                expect(result).toEqual([mockStory]);
                expect(mockLogger.error).toHaveBeenCalledWith('Failed to write news cache', {
                    error: expect.any(Error),
                    language: 'en',
                });
            });
        });
    });
});
