import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { container } from '../src/di/container.js';

// Initialize MSW
export const handlers = [
    // World News API handler
    http.get('*/world-news/*', async () => {
        return HttpResponse.json({
            news: [
                {
                    description: 'Test Description',
                    publishedAt: new Date().toISOString(),
                    title: 'Test News Article',
                    url: 'https://test.com',
                },
            ],
        });
    }),

    // Gemini API handler
    http.post('*/v1beta/models/*/generateContent', async () => {
        return HttpResponse.json({
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                text: 'Generated test article content',
                            },
                        ],
                    },
                },
            ],
        });
    }),
];

export const server = setupServer(...handlers);

// Setup function to be called before tests
export async function setupIntegrationTest() {
    // Start MSW server
    server.listen({ onUnhandledRequest: 'error' });

    // Reset database before each test
    // const database = getDatabase();
    // await database.article.deleteMany();

    return {
        container,
        server,
    };
}

// Cleanup function to be called after tests
export async function cleanupIntegrationTest() {
    server.close();
}
