import { LoggerPort } from '@jterrazz/logger';
import { mock } from 'jest-mock-extended';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import {
    FetchNewsOptions,
    NewsArticle,
    NewsPort,
} from '../../../../application/ports/outbound/data-sources/news.port.js';

import { ArticleCountry } from '../../../../domain/value-objects/article-country.vo.js';
import { ArticleLanguage } from '../../../../domain/value-objects/article-language.vo.js';

import { CachedNewsAdapter } from '../cached-news.adapter.js';

jest.mock('node:fs');

describe('CachedNewsAdapter', () => {
    // Given
    const mockNewsSource = mock<NewsPort>();
    const mockLogger = mock<LoggerPort>();
    const cacheDirectory = 'test';

    const defaultOptions: FetchNewsOptions = {
        country: ArticleCountry.create('us'),
        language: ArticleLanguage.create('en'),
    };

    const mockArticle: NewsArticle = {
        publishedAt: new Date('2024-03-08T00:00:00.000Z'),
        summary: 'Test summary',
        title: 'Test title',
        url: 'https://test.com',
    };

    let adapter: CachedNewsAdapter;

    beforeEach(() => {
        jest.clearAllMocks();
        adapter = new CachedNewsAdapter(mockNewsSource, mockLogger, cacheDirectory);
    });

    describe('fetchNews', () => {
        it('should return cached data when valid cache exists', async () => {
            // Given
            const validCache = {
                data: [mockArticle],
                timestamp: Date.now(),
            };
            (existsSync as jest.Mock).mockReturnValue(true);
            (readFileSync as jest.Mock).mockReturnValue(JSON.stringify(validCache));

            // When
            const result = await adapter.fetchNews(defaultOptions);

            // Then
            expect(result).toEqual([mockArticle]);
            expect(mockNewsSource.fetchNews).not.toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith('Using cached news data', { language: 'en' });
        });

        it('should fetch fresh data when cache is expired', async () => {
            // Given
            const expiredCache = {
                data: [mockArticle],
                timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours old
            };
            (existsSync as jest.Mock).mockReturnValue(true);
            (readFileSync as jest.Mock).mockReturnValue(JSON.stringify(expiredCache));
            mockNewsSource.fetchNews.mockResolvedValue([mockArticle]);

            // When
            const result = await adapter.fetchNews(defaultOptions);

            // Then
            expect(result).toEqual([mockArticle]);
            expect(mockNewsSource.fetchNews).toHaveBeenCalledWith(defaultOptions);
            expect(mockLogger.info).toHaveBeenCalledWith('Fetching fresh news data', {
                language: 'en',
            });
            expect(writeFileSync).toHaveBeenCalledWith(
                expect.stringContaining(`${cacheDirectory}/articles/en.json`),
                expect.any(String),
            );
        });

        it('should fetch fresh data when cache does not exist', async () => {
            // Given
            (existsSync as jest.Mock).mockReturnValue(false);
            mockNewsSource.fetchNews.mockResolvedValue([mockArticle]);

            // When
            const result = await adapter.fetchNews(defaultOptions);

            // Then
            expect(result).toEqual([mockArticle]);
            expect(mockNewsSource.fetchNews).toHaveBeenCalledWith(defaultOptions);
            expect(mockLogger.info).toHaveBeenCalledWith('Fetching fresh news data', {
                language: 'en',
            });
        });

        describe('error handling', () => {
            it('should fallback to fresh data when cache read fails', async () => {
                // Given
                (existsSync as jest.Mock).mockReturnValue(true);
                (readFileSync as jest.Mock).mockImplementation(() => {
                    throw new Error('Read error');
                });
                mockNewsSource.fetchNews.mockResolvedValue([mockArticle]);

                // When
                const result = await adapter.fetchNews(defaultOptions);

                // Then
                expect(result).toEqual([mockArticle]);
                expect(mockLogger.error).toHaveBeenCalledWith('Failed to read news cache', {
                    error: expect.any(Error),
                });
                expect(mockNewsSource.fetchNews).toHaveBeenCalledWith(defaultOptions);
            });

            it('should return data even when cache write fails', async () => {
                // Given
                (existsSync as jest.Mock).mockReturnValue(false);
                (writeFileSync as jest.Mock).mockImplementation(() => {
                    throw new Error('Write error');
                });
                mockNewsSource.fetchNews.mockResolvedValue([mockArticle]);

                // When
                const result = await adapter.fetchNews(defaultOptions);

                // Then
                expect(result).toEqual([mockArticle]);
                expect(mockLogger.error).toHaveBeenCalledWith('Failed to write news cache', {
                    error: expect.any(Error),
                });
            });
        });
    });
});
