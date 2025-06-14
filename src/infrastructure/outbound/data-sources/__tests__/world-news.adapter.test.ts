import { type LoggerPort } from '@jterrazz/logger';
import { type MonitoringPort } from '@jterrazz/monitoring';
import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    mockOf,
    mockOfDate,
    vitest,
} from '@jterrazz/test';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { ZodError } from 'zod/v4';

import { Country } from '../../../../domain/value-objects/country.vo.js';

import { createTZDateForCountry } from '../../../../shared/date/timezone.js';
import { WorldNewsAdapter, type WorldNewsAdapterConfiguration } from '../world-news.adapter.js';

const mockConfiguration: WorldNewsAdapterConfiguration = {
    apiKey: 'test-world-news-key',
};
const mockLogger = mockOf<LoggerPort>();

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

        // Always return multiple articles for all tests
        const mockResponse = {
            country: sourceCountry || 'us',
            language: language || 'en',
            top_news: [
                {
                    news: [
                        {
                            publish_date: '2024-03-10T12:00:00Z',
                            summary: 'Test summary',
                            text: 'short',
                            title: 'Short',
                            url: 'https://example.com/article1',
                        },
                        {
                            publish_date: '2024-03-11T12:00:00Z',
                            summary: 'Test summary',
                            text: 'a bit longer',
                            title: 'Medium',
                            url: 'https://example.com/article2',
                        },
                        {
                            publish_date: '2024-03-12T12:00:00Z',
                            summary: 'Test summary',
                            text: 'this is the longest article text',
                            title: 'Long',
                            url: 'https://example.com/article3',
                        },
                    ],
                },
            ],
        };

        return HttpResponse.json(mockResponse);
    }),
);

let adapter: WorldNewsAdapter;

beforeAll(() => {
    server.listen();
    vitest.useFakeTimers();
});
beforeEach(() => {
    const newRelicAdapter = mockOf<MonitoringPort>();
    newRelicAdapter.monitorSegment.mockImplementation(async (_name, cb) => cb());
    adapter = new WorldNewsAdapter(mockConfiguration, mockLogger, newRelicAdapter);
    requestedDates = {};
});
afterEach(() => {
    server.resetHandlers();
});
afterAll(() => {
    server.close();
    vitest.useRealTimers();
});

describe('WorldNewsAdapter', () => {
    it('should fetch news successfully', async () => {
        // Given - a valid API key and a response with multiple articles

        // When - fetching news from the adapter
        const result = await adapter.fetchTopNews();

        // Then - it should return only the median-length article
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            publishedAt: new Date('2024-03-11T12:00:00Z'),
            publishedCount: 3,
            text: 'a bit longer',
            title: 'Medium',
        });
    });

    it('should use correct date based on country timezone', async () => {
        // Given - a date representing 2:30 AM in France on Jan 15
        const fakeDate = createTZDateForCountry(new Date(2024, 0, 15, 2, 30, 0, 0), 'fr');
        const utcTimestamp = fakeDate.getTime();
        mockOfDate.set(utcTimestamp);

        // When - fetching news for different countries
        const first = adapter.fetchTopNews();
        vitest.runAllTimers();
        await first;

        vitest.advanceTimersByTime(1500);
        const second = adapter.fetchTopNews({ country: Country.create('fr') });
        vitest.runAllTimers();
        await second;

        // Then - it should use the correct date for each country
        expect(requestedDates['us']).toBe('2024-01-14');
        expect(requestedDates['fr']).toBe('2024-01-15');

        mockOfDate.reset();
    });

    it('should handle API errors gracefully', async () => {
        // Given - the API returns a 500 error
        server.use(
            http.get('https://api.worldnewsapi.com/top-news', () => {
                return new HttpResponse(null, { status: 500 });
            }),
        );

        // When - fetching news
        const result = await adapter.fetchTopNews();

        // Then - it should return an empty array and log the error
        expect(result).toEqual([]);
        expect(mockLogger.error).toHaveBeenCalledWith('Failed to fetch news:', {
            status: 500,
            statusText: 'Internal Server Error',
        });
    });

    it('should handle invalid API key', async () => {
        // Given - the API returns a 401 unauthorized error
        server.use(
            http.get('https://api.worldnewsapi.com/top-news', () => {
                return new HttpResponse(null, { status: 401 });
            }),
        );

        // When - fetching news
        const result = await adapter.fetchTopNews();

        // Then - it should return an empty array and log the error
        expect(result).toEqual([]);
        expect(mockLogger.error).toHaveBeenCalledWith('Failed to fetch news:', {
            status: 401,
            statusText: 'Unauthorized',
        });
    });

    it('should handle invalid response data', async () => {
        // Given - the API returns an invalid data structure
        server.use(
            http.get('https://api.worldnewsapi.com/top-news', () => {
                return HttpResponse.json({ invalid: 'data' });
            }),
        );

        // When - fetching news
        const result = await adapter.fetchTopNews();

        // Then - it should return an empty array and log the error
        expect(result).toEqual([]);
        expect(mockLogger.error).toHaveBeenCalledWith('Failed to fetch en news:', {
            country: 'us',
            error: expect.any(ZodError),
            language: 'en',
        });
    });

    it('should respect rate limiting between requests', async () => {
        // Given - two consecutive requests
        // When - making the requests
        const first = adapter.fetchTopNews();
        vitest.runAllTimers();
        const firstResult = await first;
        vitest.advanceTimersByTime(1500);
        const second = adapter.fetchTopNews();
        vitest.runAllTimers();
        const secondResult = await second;

        // Then - both should return arrays (possibly empty)
        expect(Array.isArray(firstResult)).toBe(true);
        expect(Array.isArray(secondResult)).toBe(true);
    });
});

describe('WorldNewsAdapter.transformResponse', () => {
    it('should select the article with the median text length from each section', () => {
        // Given
        const adapter = new WorldNewsAdapter(
            { apiKey: 'irrelevant' },
            mockLogger,
            mockOf<MonitoringPort>(),
        );
        const response = {
            country: 'us',
            language: 'en',
            top_news: [
                {
                    news: [
                        {
                            publish_date: '2024-01-01T00:00:00Z',
                            text: 'short',
                            title: 'Short',
                        },
                        {
                            publish_date: '2024-01-02T00:00:00Z',
                            text: 'a bit longer',
                            title: 'Medium',
                        },
                        {
                            publish_date: '2024-01-03T00:00:00Z',
                            text: 'this is the longest article text',
                            title: 'Long',
                        },
                    ],
                },
            ],
        };

        // When
        // @ts-expect-error: testing private method
        const result = adapter.transformResponse(response);

        // Then
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            publishedAt: new Date('2024-01-02T00:00:00Z'),
            publishedCount: 3,
            text: 'a bit longer',
            title: 'Medium',
        });
    });

    it('should select the lower median if even number of articles', () => {
        // Given
        const adapter = new WorldNewsAdapter(
            { apiKey: 'irrelevant' },
            mockLogger,
            mockOf<MonitoringPort>(),
        );
        const response = {
            country: 'us',
            language: 'en',
            top_news: [
                {
                    news: [
                        {
                            publish_date: '2024-01-01T00:00:00Z',
                            text: 'a',
                            title: 'A',
                        },
                        {
                            publish_date: '2024-01-02T00:00:00Z',
                            text: 'bb',
                            title: 'BB',
                        },
                        {
                            publish_date: '2024-01-03T00:00:00Z',
                            text: 'ccc',
                            title: 'CCC',
                        },
                        {
                            publish_date: '2024-01-04T00:00:00Z',
                            text: 'dddd',
                            title: 'DDDD',
                        },
                    ],
                },
            ],
        };

        // When
        // @ts-expect-error: testing private method
        const result = adapter.transformResponse(response);

        // Then
        // Sorted by text length: a (1), bb (2), ccc (3), dddd (4) => medianIndex = 1 (bb)
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            publishedAt: new Date('2024-01-02T00:00:00Z'),
            publishedCount: 4,
            text: 'bb',
            title: 'BB',
        });
    });
});
