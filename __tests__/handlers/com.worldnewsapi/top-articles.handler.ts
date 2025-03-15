import { http, HttpResponse } from 'msw';

/**
 * Mock handler for the World News API top news endpoint
 * Validates query parameters and returns test article data
 */
export const mockWorldNewsTopArticlesHandler = http.get(
    'https://api.worldnewsapi.com/top-news',
    ({ request }) => {
        const url = new URL(request.url);
        const apiKey = url.searchParams.get('api-key');
        const sourceCountry = url.searchParams.get('source-country');
        const language = url.searchParams.get('language');
        const date = url.searchParams.get('date');

        // Validate exact query parameters
        if (
            apiKey !== 'test-world-news-key' ||
            sourceCountry !== 'us' ||
            language !== 'en' ||
            date !== '2025-03-15'
        ) {
            return new HttpResponse(null, {
                status: 400,
                statusText: 'Invalid query parameters',
            });
        }

        // Return mock response matching the test expectations
        return HttpResponse.json({
            country: sourceCountry,
            language: language,
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
        });
    },
);
