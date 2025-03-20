import { http, HttpResponse } from 'msw';

interface MockArticle {
    category: string;
    content: string;
    fakeReason: string | null;
    headline: string;
    isFake: boolean;
    summary: string;
}

interface GeminiErrorResponse {
    error: {
        code: number;
        details: Array<{
            '@type': string;
            domain: string;
            metadata: {
                service: string;
            };
            reason: string;
        }>;
        message: string;
        status: string;
    };
}

interface GeminiSuccessResponse {
    candidates: Array<{
        content: {
            parts: Array<{
                text: string;
            }>;
        };
        finishReason: 'STOP';
        safetyRatings: Array<never>;
    }>;
    promptFeedback: {
        safetyRatings: Array<never>;
    };
}

interface GeminiRequest {
    contents: Array<{
        parts: Array<{
            text: string;
        }>;
    }>;
}

const TEST_API_KEY = 'test-gemini-key';

const MOCK_ARTICLE_TEMPLATES: MockArticle[] = [
    {
        category: 'technology',
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
        category: 'technology',
        content:
            'Recent developments in automated content generation demonstrate significant progress in creating factual news articles. Researchers emphasize the importance of maintaining journalistic standards in AI-generated content.',
        fakeReason: null,
        headline: 'Test Article Shows Promise in News Generation Research',
        isFake: false,
        summary: 'Test summary showcasing advances in AI-powered news generation.',
    },
];

const INVALID_API_KEY_RESPONSE: GeminiErrorResponse = {
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
 * Generates a specified number of mock articles by alternating between fake and real articles.
 *
 * @param count - The number of articles to generate
 * @returns An array of mock articles
 */
const generateMockArticles = (count: number): MockArticle[] => {
    const articles: MockArticle[] = [];

    for (let i = 0; i < count; i++) {
        // Alternate between fake and real articles
        const template = MOCK_ARTICLE_TEMPLATES[i % 2];

        articles.push({
            ...template,
            // Add a suffix to make each article unique
            headline: `${template.headline} ${i + 1}`,
            summary: `${template.summary} (Article ${i + 1})`,
        });
    }

    return articles;
};

/**
 * Mock handler for Google's Gemini API content generation endpoint.
 * Validates the API key and returns a predefined response for article generation requests.
 * The number of articles to generate can be specified in the request prompt.
 *
 * @see https://ai.google.dev/api/rest/v1beta/models/generateContent
 */
export const mockGeminiGenerateContentHandler = http.post(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-pro-exp:generateContent',
    async ({ request }) => {
        const apiKey = request.headers.get('x-goog-api-key');

        if (apiKey !== TEST_API_KEY) {
            return new HttpResponse(JSON.stringify(INVALID_API_KEY_RESPONSE), {
                headers: { 'Content-Type': 'application/json' },
                status: 400,
            });
        }

        // Parse request body to get the number of articles to generate
        const requestBody = (await request.json()) as GeminiRequest;
        const promptText = requestBody.contents?.[0]?.parts?.[0]?.text ?? '';
        const articleCountMatch = promptText.match(/Generate exactly (\d+) articles?/i);

        if (!articleCountMatch) {
            throw new Error('Number of articles not specified in prompt');
        }

        const articleCount = parseInt(articleCountMatch[1], 10);

        const response: GeminiSuccessResponse = {
            candidates: [
                {
                    content: {
                        parts: [{ text: JSON.stringify(generateMockArticles(articleCount)) }],
                    },
                    finishReason: 'STOP',
                    safetyRatings: [],
                },
            ],
            promptFeedback: {
                safetyRatings: [],
            },
        };

        return HttpResponse.json(response);
    },
);
