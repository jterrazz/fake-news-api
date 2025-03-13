// import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
// import { Category, type Country, Language } from '@prisma/client';
// import { z } from 'zod';

// const generateArticleFromPrompt = async ({
//     language,
//     model,
//     prompt,
//     publishDate,
//     sourceCountry,
// }: GenerateArticleParams): Promise<Article[]> => {
//     const result = await model.generateContent(prompt);
//     const text = result.response.text();
//     if (!text) return [];

//     const json = text.slice(text.indexOf('['), text.lastIndexOf(']') + 1);
//     const articles = GeneratedArticleSchema.parse(JSON.parse(json));

//     // Base date from publishDate or current time
//     const baseDate = publishDate ? new Date(publishDate) : new Date();

//     // Shuffle articles to randomize real/fake order
//     const shuffledArticles = [...articles].sort(() => Math.random() - 0.5);

//     // Add metadata to each article
//     return shuffledArticles.map((article, index) => {
//         const uniqueDate = new Date(baseDate);
//         // Add index * 1 second to ensure unique timestamps
//         uniqueDate.setSeconds(uniqueDate.getSeconds() + index);

//         return {
//             ...article,
//             country: sourceCountry,
//             createdAt: uniqueDate,
//             id: crypto.randomUUID(),
//             language,
//         };
//     });
// };

// export const generateArticles = async (language: Language = Language.en): Promise<Article[]> => {
//     try {
//         const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
//         const sourceCountry: Country = language === Language.en ? 'us' : 'fr';
//         const newsService = getNews();

//         // Fetch real news articles
//         const realNews = await newsService.fetchNews({
//             language,
//             sourceCountry,
//         });

//         // Early return if no real news is available
//         if (!realNews?.length) {
//             logger.warn('No real news available', { language, sourceCountry });
//             return [];
//         }

//         // Get articles from the last 2 weeks to avoid duplication
//         const twoWeeksAgo = new Date();
//         twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

//         const articleRepository = getArticleRepository();
//         const recentArticles = await articleRepository.findLatestSummaries({
//             country: sourceCountry,
//             language,
//             since: twoWeeksAgo,
//         });

//         // Shuffle and take a random selection of real news
//         const newsToProcess = [...realNews].sort(() => Math.random() - 0.5).slice(0, 7);

//         // Get the most recent publish date from available news items
//         const publishDate = newsToProcess.reduce((latest, news) => {
//             if (!news.publishDate) return latest;
//             const date = new Date(news.publishDate);
//             return !latest || date > latest ? date : latest;
//         }, new Date());

//         const prompt = generateMixedNewsPrompt(
//             newsToProcess.map((news) => ({
//                 summary: news.summary,
//                 title: news.title,
//             })),
//             recentArticles,
//             language,
//         );

//         const generatedArticles = await generateArticleFromPrompt({
//             language,
//             model,
//             prompt,
//             publishDate: publishDate.toISOString(),
//             sourceCountry,
//         });

//         // Log generation stats for monitoring
//         const realCount = generatedArticles.filter((a) => !a.isFake).length;
//         const fakeCount = generatedArticles.filter((a) => a.isFake).length;
//         logger.info('Generated articles', {
//             fakeCount,
//             language,
//             realCount,
//             sourceCountry,
//             total: generatedArticles.length,
//         });

//         return generatedArticles;
//     } catch (error) {
//         logger.error('Failed to generate articles', { error, language });
//         throw error;
//     }
// };
