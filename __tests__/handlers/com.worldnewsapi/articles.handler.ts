import { http, HttpResponse } from 'msw';

import { formatInTimezone, getTimezoneForCountry } from '../../../src/shared/date/timezone.js';

const TEST_API_KEY = 'test-world-news-key';
const TEST_COUNTRY = 'us';
const TEST_LANGUAGE = 'en';
const TEST_DATE = '2020-01-01';

interface MockArticleResponse {
    country: string;
    language: string;
    top_news: Array<{
        news: Array<{
            publish_date: string;
            summary: string;
            text: string;
            title: string;
            url: string;
        }>;
    }>;
}

/**
 * Mock handler for the World News API top news endpoint.
 * Returns test article data for a specific date in the correct timezone.
 */
export const mockWorldNewsTopArticlesHandler = http.get(
    'https://api.worldnewsapi.com/top-news',
    ({ request }) => {
        const url = new URL(request.url);
        const params = {
            apiKey: url.searchParams.get('api-key'),
            date: url.searchParams.get('date'),
            language: url.searchParams.get('language'),
            sourceCountry: url.searchParams.get('source-country'),
        };

        // Validate required query parameters
        if (
            params.apiKey !== TEST_API_KEY ||
            params.sourceCountry !== TEST_COUNTRY ||
            params.language !== TEST_LANGUAGE ||
            params.date !== TEST_DATE
        ) {
            return new HttpResponse(null, {
                status: 400,
                statusText: 'Invalid query parameters',
            });
        }

        // Format the publish date in the correct timezone for the source country
        const timezone = getTimezoneForCountry(TEST_COUNTRY);
        const publishDate = formatInTimezone(
            new Date(`${TEST_DATE}T12:00:00Z`),
            timezone,
            "yyyy-MM-dd'T'HH:mm:ssXXX",
        );

        const response: MockArticleResponse = {
            country: params.sourceCountry,
            language: params.language,
            top_news: [
                {
                    news: [
                        {
                            publish_date: publishDate,
                            summary: 'Test summary',
                            text: 'Test article text',
                            title: 'Test Article',
                            url: 'https://example.com/article',
                        },
                    ],
                },
            ],
        };

        return HttpResponse.json(response);
    },
);
