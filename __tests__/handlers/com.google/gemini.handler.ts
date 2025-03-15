import { http, HttpResponse } from 'msw';

/**
 * Mock handler for Google's Gemini API content generation endpoint
 * Returns a predefined response for article generation requests
 */
export const mockGeminiGenerateContentHandler = http.post(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
    () => {
        // Return a mock response that matches Gemini's API format
        return HttpResponse.json({
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                text: JSON.stringify([
                                    {
                                        category: 'TECHNOLOGY',
                                        content:
                                            'A consortium of leading tech companies unveiled a groundbreaking advancement in quantum computing technology, achieving unprecedented qubit stability at room temperature. The development promises to accelerate the commercialization of quantum computers.',
                                        fakeReason:
                                            'While quantum computing research is ongoing, room temperature qubit stability remains a significant challenge. This article fabricates a breakthrough that has not occurred.',
                                        headline:
                                            'Global Tech Leaders Announce Revolutionary Quantum Computing Breakthrough',
                                        isFake: true,
                                        summary:
                                            'Major technology companies have achieved a significant breakthrough in quantum computing, demonstrating stable qubit operations at room temperature.',
                                    },
                                    {
                                        category: 'TECHNOLOGY',
                                        content:
                                            'Recent developments in automated content generation demonstrate significant progress in creating factual news articles. Researchers emphasize the importance of maintaining journalistic standards in AI-generated content.',
                                        fakeReason: null,
                                        headline:
                                            'Test Article Shows Promise in News Generation Research',
                                        isFake: false,
                                        summary:
                                            'Test summary showcasing advances in AI-powered news generation.',
                                    },
                                ]),
                            },
                        ],
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
