import { http, HttpResponse } from 'msw';

export const newsHandlers = [
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
]; 