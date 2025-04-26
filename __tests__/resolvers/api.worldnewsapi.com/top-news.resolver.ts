import { http, HttpResponse } from 'msw';

import {
    createTZDateForCountry,
    formatTZDateInCountry,
} from '../../../src/shared/date/timezone.js';

const TEST_API_KEY = 'test-world-news-key';
const TEST_COUNTRY = 'us';
const TEST_LANGUAGE = 'en';
const TEST_DATE = '2020-01-01';

interface MockTopNewsResponse {
    country: string;
    language: string;
    top_news: Array<{
        news: Array<{
            publish_date: string;
            text: string;
            title: string;
        }>;
    }>;
}

/**
 * Mock handler for the World News API top news endpoint.
 * Returns test article data for a specific date in the correct timezone.
 */
export const worldNewsResolver = http.get(
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
        const publishDate = formatTZDateInCountry(
            createTZDateForCountry(new Date(`${TEST_DATE}T12:00:00Z`), TEST_COUNTRY),
            TEST_COUNTRY,
            "yyyy-MM-dd'T'HH:mm:ssXXX",
        );

        const response: MockTopNewsResponse = {
            country: params.sourceCountry,
            language: params.language,
            top_news: new Array(10).fill({
                news: [
                    {
                        publish_date: publishDate,
                        text: 'Test article text',
                        title: 'Test Article',
                    },
                ],
            }),
        };

        return HttpResponse.json(response);
    },
);
