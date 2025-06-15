import { http, HttpResponse } from 'msw';

import {
    createTZDateForCountry,
    formatTZDateForCountry,
} from '../../../src/shared/date/timezone.js';

const TEST_API_KEY = 'test-world-news-key';
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
 * Returns test article data for different country-language combinations used by the article generation task.
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

        // Validate required parameters
        if (
            params.apiKey !== TEST_API_KEY ||
            params.date !== TEST_DATE ||
            !params.sourceCountry ||
            !params.language
        ) {
            return new HttpResponse(null, {
                status: 400,
                statusText: 'Invalid query parameters',
            });
        }

        // Format the publish date in the correct timezone for the source country
        const publishDate = formatTZDateForCountry(
            createTZDateForCountry(new Date(`${TEST_DATE}T12:00:00Z`), params.sourceCountry!),
            params.sourceCountry!,
            "yyyy-MM-dd'T'HH:mm:ssXXX",
        );

        // Return articles with coverage > 2 to pass the use case's filter
        const response: MockTopNewsResponse = {
            country: params.sourceCountry!,
            language: params.language!,
            top_news: new Array(5).fill(null).map((_, index) => ({
                news: new Array(5).fill(null).map((_, newsIndex) => ({
                    publish_date: publishDate,
                    text: `Test article text ${index}-${newsIndex} for ${params.sourceCountry!} in ${params.language!}`,
                    title: `Test Article ${index}-${newsIndex} (${params.sourceCountry!.toUpperCase()}/${params.language!.toUpperCase()})`,
                })),
            })),
        };

        return HttpResponse.json(response);
    },
);
