import { http, HttpResponse } from 'msw';

const TEST_API_KEY = 'test-openrouter-key';

interface MockArticle {
    category: string;
    content: string;
    fakeReason: string | null;
    headline: string;
    isFake: boolean;
    summary: string;
}

interface MockOpenRouterRequest {
    messages: Array<{
        content: string;
        role: 'user';
    }>;
    model: string;
}

interface MockOpenRouterResponse {
    id: string;
    choices: Array<{
        message: {
            content: string;
            role: 'assistant';
        };
        finish_reason: 'stop';
    }>;
    model: string;
}

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
 * Mock handler for OpenRouter's API content generation endpoint.
 * Returns test article data based on the prompt's requested article count.
 */
export const openRouterGenerateArticlesResolver = http.post(
    'https://openrouter.ai/api/v1/chat/completions',
    async ({ request }) => {
        const apiKey = request.headers.get('authorization')?.replace('Bearer ', '');
        const requestBody = (await request.json()) as MockOpenRouterRequest;

        // Validate request parameters
        if (apiKey !== TEST_API_KEY || !requestBody.messages?.length || !requestBody.model) {
            return new HttpResponse(
                JSON.stringify({
                    error: {
                        code: 400,
                        message: 'Invalid request parameters',
                        type: 'invalid_request_error',
                    },
                }),
                {
                    headers: { 'Content-Type': 'application/json' },
                    status: 400,
                },
            );
        }

        const promptText = requestBody.messages[0].content;
        const articleCountMatch = promptText.match(/Generate exactly (\d+) articles?/i);

        if (!articleCountMatch) {
            return new HttpResponse(
                JSON.stringify({
                    error: {
                        code: 400,
                        message: 'Number of articles not specified in prompt',
                        type: 'invalid_request_error',
                    },
                }),
                {
                    headers: { 'Content-Type': 'application/json' },
                    status: 400,
                },
            );
        }

        const articleCount = parseInt(articleCountMatch[1], 10);
        const mockArticles = generateMockArticles(articleCount);

        const response: MockOpenRouterResponse = {
            choices: [
                {
                    finish_reason: 'stop',
                    message: {
                        content: JSON.stringify(mockArticles),
                        role: 'assistant',
                    },
                },
            ],
            id: 'mock-completion-id',
            model: requestBody.model,
        };

        return HttpResponse.json(response);
    },
);
