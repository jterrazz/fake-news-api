import { mock } from 'jest-mock-extended';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import {
    ApiConfiguration,
    ConfigurationPort,
} from '../../../../application/ports/inbound/configuration.port.js';

import { LoggerPort } from '../../../../application/ports/outbound/logging/logger.port.js';

import { ArticleCountry } from '../../../../domain/value-objects/article-country.vo.js';
import { ArticleLanguage } from '../../../../domain/value-objects/article-language.vo.js';

import { WorldNewsAdapter } from '../world-news.adapter.js';

// Given: Mock configuration with valid API key
const mockConfig = mock<ConfigurationPort>({
    getApiConfiguration: () =>
        mock<ApiConfiguration>({
            worldNews: { apiKey: 'test-world-news-key' },
        }),
});

// Given: Mock logger
const mockLogger = mock<LoggerPort>();

// Given: MSW server setup for API mocking
const server = setupServer(
    http.get('https://api.worldnewsapi.com/top-news', ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const apiKey = url.searchParams.get('api-key');
        const sourceCountry = url.searchParams.get('source-country');
        const language = url.searchParams.get('language');

        if (apiKey !== 'test-world-news-key') {
            return new HttpResponse(null, { status: 401 });
        }

        const mockResponse = {
            country: sourceCountry || 'us',
            language: language || 'en',
            top_news: [
                {
                    news: [
                        {
                            publish_date: '2024-03-10T12:00:00Z',
                            summary: 'Test summary',
                            text: 'Test article text',
                            title: 'Test Article',
                            url: 'https://example.com/article',
                        },
                    ],
                },
            ],
        };

        return HttpResponse.json(mockResponse);
    }),
);

describe('WorldNewsAdapter', () => {
    let adapter: WorldNewsAdapter;

    beforeAll(() => server.listen());
    beforeEach(() => {
        adapter = new WorldNewsAdapter(mockConfig, mockLogger);
    });
    afterEach(() => {
        server.resetHandlers();
    });
    afterAll(() => server.close());

    it('should fetch news successfully', async () => {
        // Given: Valid API key and response
        const country = ArticleCountry.create('us');
        const language = ArticleLanguage.create('en');

        // When: Fetching news
        const result = await adapter.fetchNews({ country, language });

        // Then: Should return valid news articles
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            publishedAt: new Date('2024-03-10T12:00:00Z'),
            summary: 'Test summary',
            title: 'Test Article',
            url: 'https://example.com/article',
        });
    });

    it('should handle API errors gracefully', async () => {
        // Given: API returns 500 error
        server.use(
            http.get('https://api.worldnewsapi.com/top-news', () => {
                return new HttpResponse(null, { status: 500 });
            }),
        );
        const country = ArticleCountry.create('us');
        const language = ArticleLanguage.create('en');

        // When: Fetching news
        const result = await adapter.fetchNews({ country, language });

        // Then: Should return empty array and log error
        expect(result).toEqual([]);
        expect(mockLogger.error).toHaveBeenCalledWith('Failed to fetch news:', {
            status: 500,
            statusText: 'Internal Server Error',
        });
    });

    it('should handle invalid API key', async () => {
        // Given: API returns 401 unauthorized
        server.use(
            http.get('https://api.worldnewsapi.com/top-news', () => {
                return new HttpResponse(null, { status: 401 });
            }),
        );
        const country = ArticleCountry.create('us');
        const language = ArticleLanguage.create('en');

        // When: Fetching news
        const result = await adapter.fetchNews({ country, language });

        // Then: Should return empty array and log error
        expect(result).toEqual([]);
        expect(mockLogger.error).toHaveBeenCalledWith('Failed to fetch news:', {
            status: 401,
            statusText: 'Unauthorized',
        });
    });

    it('should handle invalid response data', async () => {
        // Given: API returns invalid data structure
        server.use(
            http.get('https://api.worldnewsapi.com/top-news', () => {
                return HttpResponse.json({ invalid: 'data' });
            }),
        );
        const country = ArticleCountry.create('us');
        const language = ArticleLanguage.create('en');

        // When: Fetching news
        const result = await adapter.fetchNews({ country, language });

        // Then: Should return empty array and log error
        expect(result).toEqual([]);
        expect(mockLogger.error).toHaveBeenCalledWith('Failed to fetch en news:', {
            country: ArticleCountry.create('us'),
            error: expect.any(Error),
            language: ArticleLanguage.create('en'),
        });
    });

    it('should respect rate limiting between requests', async () => {
        // Given: Two consecutive requests
        const country = ArticleCountry.create('us');
        const language = ArticleLanguage.create('en');
        const startTime = Date.now();

        // When: Making two consecutive requests
        await adapter.fetchNews({ country, language });
        await adapter.fetchNews({ country, language });

        // Then: Should take at least 1.2 seconds between requests
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        expect(totalTime).toBeGreaterThanOrEqual(1200);
    });
});
