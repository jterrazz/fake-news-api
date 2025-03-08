import { getArticleRepository, getNews } from '../../../../di/container.js';

export const generateDailyArticles = async (): Promise<void> => {
    const newsService = getNews();
    const articleRepository = getArticleRepository();

    const articles = await newsService.fetchNews({
        language: 'en',
        sourceCountry: 'us',
    });

    // TODO: Transform and save articles
    console.log('Generated articles:', articles);
};
