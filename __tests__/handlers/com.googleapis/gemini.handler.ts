import { type Category } from '@prisma/client';
import { http, HttpResponse } from 'msw';

type MockArticle = {
    category: Category;
    content: string;
    fakeReason: string | null;
    headline: string;
    isFake: boolean;
    summary: string;
};

const MOCK_ARTICLES: MockArticle[] = [
    {
        category: 'TECHNOLOGY',
        content:
            'A consortium of leading tech companies unveiled a groundbreaking advancement in quantum computing technology, achieving unprecedented qubit stability at room temperature. The development promises to accelerate the commercialization of quantum computers.',
        fakeReason:
            'While quantum computing research is ongoing, room temperature qubit stability remains a significant challenge. This article fabricates a breakthrough that has not occurred.',
        headline: 'Global Tech Leaders Announce Revolutionary Quantum Computing Breakthrough',
        isFake: true,
        summary:
            'Major technology companies have achieved a significant breakthrough in quantum computing, demonstrating stable qubit operations at room temperature.',
    },
    {
        category: 'TECHNOLOGY',
        content:
            'Recent developments in automated content generation demonstrate significant progress in creating factual news articles. Researchers emphasize the importance of maintaining journalistic standards in AI-generated content.',
        fakeReason: null,
        headline: 'Test Article Shows Promise in News Generation Research',
        isFake: false,
        summary: 'Test summary showcasing advances in AI-powered news generation.',
    },
];

const INVALID_API_KEY_RESPONSE = {
    error: {
        code: 400,
        details: [
            {
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
                domain: 'googleapis.com',
                metadata: {
                    service: 'generativelanguage.googleapis.com',
                },
                reason: 'API_KEY_INVALID',
            },
        ],
        message: 'API key not valid. Please pass a valid API key.',
        status: 'INVALID_ARGUMENT',
    },
};

/**
 * Mock handler for Google's Gemini API content generation endpoint.
 * Validates the API key and returns a predefined response for article generation requests.
 *
 * @see https://ai.google.dev/api/rest/v1beta/models/generateContent
 */
export const mockGeminiGenerateContentHandler = http.post(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
    ({ request }) => {
        const apiKey = request.headers.get('x-goog-api-key');

        if (apiKey !== 'test-gemini-key') {
            return new HttpResponse(JSON.stringify(INVALID_API_KEY_RESPONSE), {
                headers: { 'Content-Type': 'application/json' },
                status: 400,
            });
        }

        return HttpResponse.json({
            candidates: [
                {
                    content: {
                        parts: [{ text: JSON.stringify(MOCK_ARTICLES) }],
                    },
                    finishReason: 'STOP',
                    safetyRatings: [],
                },
            ],
            promptFeedback: {
                safetyRatings: [],
            },
        });
    },
);
