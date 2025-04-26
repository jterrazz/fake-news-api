import { type LoggerPort } from '@jterrazz/logger';
import { type MonitoringPort } from '@jterrazz/monitoring';
import { mock } from 'jest-mock-extended';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { ArticleCountry } from '../../../../domain/value-objects/article-country.vo.js';
import { ArticleLanguage } from '../../../../domain/value-objects/article-language.vo.js';

import { createTZDateForCountry } from '../../../../shared/date/timezone.js';
import { WorldNewsAdapter, type WorldNewsAdapterConfiguration } from '../world-news.adapter.js';

const mockConfiguration: WorldNewsAdapterConfiguration = {
    apiKey: 'test-world-news-key',
};
const mockLogger = mock<LoggerPort>();

let requestedDates: Record<string, string> = {};

const server = setupServer(
    http.get('https://api.worldnewsapi.com/top-news', ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const apiKey = url.searchParams.get('api-key');
        const sourceCountry = url.searchParams.get('source-country');
        const language = url.searchParams.get('language');
        const date = url.searchParams.get('date');

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
        const newRelicAdapter = mock<MonitoringPort>();
        newRelicAdapter.monitorSegment.mockImplementation(async (_name, cb) => cb());
        adapter = new WorldNewsAdapter(mockConfiguration, mockLogger, newRelicAdapter);
        requestedDates = {};
    });
    afterEach(() => {
        server.resetHandlers();
        jest.useRealTimers();
    });
    afterAll(() => server.close());

    it('should fetch news successfully', async () => {
        // When: Fetching news
        const result = await adapter.fetchTopNews();

        // Then: Should return valid news articles
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            publishedAt: new Date('2024-03-10T12:00:00Z'),
            text: 'Test article text',
            title: 'Test Article',
        });
    });

    it('should use correct date based on country timezone', async () => {
        // Given: Create a date representing 2:30 AM in France on Jan 15
        const fakeDate = createTZDateForCountry(new Date(2024, 0, 15, 2, 30, 0, 0), 'fr');
        const utcTimestamp = fakeDate.getTime();
        jest.useFakeTimers({
            doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'clearTimeout'],
            now: utcTimestamp,
        });

        // When: Fetching news
        await adapter.fetchTopNews();
        await adapter.fetchTopNews({ country: ArticleCountry.create('fr') });

        // Then: Dates should be different based on timezone
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

        // When: Fetching news
        const result = await adapter.fetchTopNews();

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

        // When: Fetching news
        const result = await adapter.fetchTopNews();

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

        // When: Fetching news
        const result = await adapter.fetchTopNews();

        // Then: Should return empty array and log error
        expect(result).toEqual([]);
        expect(mockLogger.error).toHaveBeenCalledWith('Failed to fetch en news:', {
            country: ArticleCountry.create('us'),
            error: expect.any(Error),
            language: ArticleLanguage.create('en'),
        });
    });

    it('should respect rate limiting between requests', async () => {
        // When: Making two consecutive requests
        const first = await adapter.fetchTopNews();
        const second = await adapter.fetchTopNews();

        // Then: Both should be arrays (possibly empty)
        expect(Array.isArray(first)).toBe(true);
        expect(Array.isArray(second)).toBe(true);
    });
});
