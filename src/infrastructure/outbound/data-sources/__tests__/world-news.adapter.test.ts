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

import { COUNTRY_TIMEZONES, TZDate } from '../../../../shared/date/timezone.js';
import { NewRelicAdapter } from '../../monitoring/new-relic.adapter.js';
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

// Store requested dates for verification
let requestedDates: Record<string, string> = {};

// Given: MSW server setup for API mocking
const server = setupServer(
    http.get('https://api.worldnewsapi.com/top-news', ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const apiKey = url.searchParams.get('api-key');
        const sourceCountry = url.searchParams.get('source-country');
        const language = url.searchParams.get('language');
        const date = url.searchParams.get('date');

        // Store the requested date for verification
        if (sourceCountry && date) {
            requestedDates[sourceCountry] = date;
        }

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
        const newRelicAdapter = mock<NewRelicAdapter>();
        adapter = new WorldNewsAdapter(mockConfig, mockLogger, newRelicAdapter);
        requestedDates = {}; // Reset stored dates
    });
    afterEach(() => {
        server.resetHandlers();
        jest.useRealTimers(); // Ensure real timers are restored
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

    it('should use correct date based on country timezone', async () => {
        // Given: Create a date representing 4:30 AM in France on Jan 15
        // We need a time where:
        // - In France (UTC+1): It's Jan 15, 4:30 AM
        // - In NYC (UTC-5): It's Jan 14, 10:30 PM (previous day)
        const fakeDate = new TZDate(2024, 0, 15, 4, 30, 0, 0, COUNTRY_TIMEZONES.fr);

        // This French time converts to 3:30 AM UTC
        const utcTimestamp = fakeDate.getTime();

        // Set up Jest's fake timer with our calculated UTC time
        jest.useFakeTimers({
            doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'clearTimeout'],
            now: utcTimestamp,
        });

        // Log the mocked date for verification
        const currentDate = new Date();
        console.log('Mocked system date (UTC):', currentDate.toISOString());
        console.log('Expected US date: 2024-01-14');
        console.log('Expected FR date: 2024-01-15');

        // When: Fetching news for US and France
        const usCountry = ArticleCountry.create('us');
        const frCountry = ArticleCountry.create('fr');
        const language = ArticleLanguage.create('en');

        await adapter.fetchNews({ country: usCountry, language });
        await adapter.fetchNews({ country: frCountry, language });

        // Log actual requested dates for debugging
        console.log('Actual requested dates:', requestedDates);

        // Then: Dates should be different based on timezone
        // For US (NYC timezone UTC-5): It should be previous day (2024-01-14)
        // For France (Paris timezone UTC+1): It should be current day (2024-01-15)
        expect(requestedDates['us']).toBe('2024-01-14');
        expect(requestedDates['fr']).toBe('2024-01-15');
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
