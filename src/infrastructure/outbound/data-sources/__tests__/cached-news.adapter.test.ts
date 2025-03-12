import { mock } from 'jest-mock-extended';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import {
    FetchNewsOptions,
    NewsArticle,
    NewsPort,
} from '../../../../application/ports/outbound/data-sources/news.port.js';
import { LoggerPort } from '../../../../application/ports/outbound/logging/logger.port.js';

import { ArticleCountry } from '../../../../domain/value-objects/article-country.vo.js';
import { ArticleLanguage } from '../../../../domain/value-objects/article-language.vo.js';

import { CachedNewsAdapter } from '../cached-news.adapter.js';

// Mock fs module
jest.mock('node:fs', () => ({
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
}));

describe('CachedNewsAdapter', () => {
    // Mock news source and logger with proper types
    const mockNewsSource = mock<NewsPort>();
    const mockLogger = mock<LoggerPort>();

    const mockOptions: FetchNewsOptions = {
        country: ArticleCountry.create('us'),
        language: ArticleLanguage.create('en'),
    };

    const mockArticles: NewsArticle[] = [
        {
            publishedAt: new Date('2024-03-08'),
            summary: 'Test summary',
            title: 'Test title',
            url: 'https://test.com',
        },
    ];

    let adapter: CachedNewsAdapter;

    beforeEach(() => {
        jest.clearAllMocks();
        adapter = new CachedNewsAdapter(mockNewsSource, mockLogger);
    });

    describe('fetchNews', () => {
        it('should return cached data if valid cache exists', async () => {
            // Mock cache exists and is valid
            (existsSync as jest.Mock).mockReturnValue(true);
            (readFileSync as jest.Mock).mockReturnValue(
                JSON.stringify({
                    data: mockArticles,
                    timestamp: Date.now(), // Recent timestamp
                }),
            );

            const result = await adapter.fetchNews(mockOptions);

            expect(result).toEqual(mockArticles);
            expect(mockNewsSource.fetchNews).not.toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith('Using cached news data', {
                language: 'en',
            });
        });

        it('should fetch fresh data if cache is expired', async () => {
            // Mock cache exists but is expired
            (existsSync as jest.Mock).mockReturnValue(true);
            (readFileSync as jest.Mock).mockReturnValue(
                JSON.stringify({
                    data: mockArticles,
                    timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours old
                }),
            );
            mockNewsSource.fetchNews.mockResolvedValue(mockArticles);

            const result = await adapter.fetchNews(mockOptions);

            expect(result).toEqual(mockArticles);
            expect(mockNewsSource.fetchNews).toHaveBeenCalledWith(mockOptions);
            expect(mockLogger.info).toHaveBeenCalledWith('Fetching fresh news data', {
                language: 'en',
            });
            expect(writeFileSync).toHaveBeenCalled();
        });

        it('should fetch fresh data if cache does not exist', async () => {
            // Mock cache doesn't exist
            (existsSync as jest.Mock).mockReturnValue(false);
            mockNewsSource.fetchNews.mockResolvedValue(mockArticles);

            const result = await adapter.fetchNews(mockOptions);

            expect(result).toEqual(mockArticles);
            expect(mockNewsSource.fetchNews).toHaveBeenCalledWith(mockOptions);
            expect(mockLogger.info).toHaveBeenCalledWith('Fetching fresh news data', {
                language: 'en',
            });
            expect(writeFileSync).toHaveBeenCalled();
        });

        it('should handle cache read errors gracefully', async () => {
            // Mock cache read error
            (existsSync as jest.Mock).mockReturnValue(true);
            (readFileSync as jest.Mock).mockImplementation(() => {
                throw new Error('Read error');
            });
            mockNewsSource.fetchNews.mockResolvedValue(mockArticles);

            const result = await adapter.fetchNews(mockOptions);

            expect(result).toEqual(mockArticles);
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to read news cache', {
                error: expect.any(Error),
            });
            expect(mockNewsSource.fetchNews).toHaveBeenCalledWith(mockOptions);
        });

        it('should handle cache write errors gracefully', async () => {
            // Mock cache write error
            (existsSync as jest.Mock).mockReturnValue(false);
            (writeFileSync as jest.Mock).mockImplementation(() => {
                throw new Error('Write error');
            });
            mockNewsSource.fetchNews.mockResolvedValue(mockArticles);

            const result = await adapter.fetchNews(mockOptions);

            expect(result).toEqual(mockArticles);
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to write news cache', {
                error: expect.any(Error),
            });
        });
    });
});
