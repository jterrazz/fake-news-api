import { http, HttpResponse } from 'msw';

export const aiHandlers = [
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