import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import { Category, type Country, Language } from '@prisma/client';
import { z } from 'zod';

import { createConfigurationService } from '../application/services/configuration.service.js';

import { getArticleRepository } from '../di/container.js';
import { Article, ArticleSchema } from '../domain/article.js';

import { fetchRealNews } from './world-news.js';

const config = createConfigurationService();
const genAI = new GoogleGenerativeAI(config.getApiConfiguration().gemini.apiKey);

const GeneratedArticleSchema = z.array(
    ArticleSchema.omit({
        country: true,
        createdAt: true,
        id: true,
        language: true,
    }).extend({
        category: z.string().transform((val): Category => {
            const normalized = val.toUpperCase() as keyof typeof Category;
            return normalized in Category ? normalized : Category.OTHER;
        }),
    }),
);

const formatNewsItem = (index: number, title: string, summary: string | null): string => {
    const baseText = `${index + 1}. "${title}"`;
    return summary ? baseText + ` (Context: ${summary})` : baseText;
};

const formatNewsItems = (items: Array<{ title: string; summary: string | null }>) =>
    items.map((item, i) => formatNewsItem(i, item.title, item.summary)).join('\n');

const formatRecentArticle = (index: number, headline: string, summary: string): string =>
    `${index + 1}. "${headline}" - ${summary}`;

const formatRecentArticles = (items: Array<{ headline: string; summary: string }>) =>
    items.map((item, i) => formatRecentArticle(i, item.headline, item.summary)).join('\n');

const generateMixedNewsPrompt = (
    newsItems: Array<{ title: string; summary: string | null }>,
    recentArticles: Array<{ headline: string; summary: string }>,
    language: Language,
) => `You're creating content for a sophisticated "Spot the Fake News" game where players need sharp critical thinking to distinguish real from fictional news. The fake news should be highly believable and grounded in current events.

For REAL articles:
- Use headlines that capture the essence of the original but rephrase them to be around 8-12 words
- Keep the original language (${language === Language.fr ? 'French' : 'English'}) of the headlines and content
- Add interesting but factual details that make the story engaging
- Keep the tone professional and journalistic
- Include relevant context and factual background

For FICTIONAL articles (generate at least 2 fake articles):
- Base fake stories on current real events and trends from the original headlines
- Use the same journalistic style and tone as real news sources
- Include accurate names of real organizations, places, and public figures
- Create plausible extensions or developments of real current events
- Add subtle twists that require fact-checking to disprove
- Mix in accurate background details with the fictional elements
- Make the fictional elements logically consistent with current reality
- Avoid sensational or outlandish claims that would immediately raise suspicion
- Use realistic quotes and statistics that seem credible
- Keep the story within the realm of possibility given the current context

The response MUST BE A VALID JSON and MATCH THIS FORMAT, with AT LEAST 2 FAKE ARTICLES (isFake: true):
[
  {
    "headline": "A clear, professional headline of around 8-12 words",
    "article": "A well-crafted ~70 word article that reads like genuine news",
    "category": "One of: ${Object.keys(Category).join(', ')}",
    "summary": "A professional 1-2 sentence summary in journalistic style",
    "isFake": boolean,
    "fakeReason": "For fake articles only: A clear explanation of the subtle fictional elements and how they deviate from reality. Set to null for real articles."
  }
]

Original headlines to draw inspiration from:
${formatNewsItems(newsItems)}

Recently generated articles to avoid duplicating:
${formatRecentArticles(recentArticles)}

Important guidelines:
- Create unique headlines different from both original and recent articles
- Headlines should be clear and around 8-12 words long
- Maintain consistent professional tone across all articles
- Write all content in ${language === Language.fr ? 'French' : 'English'}
- Use proper journalistic style and structure
- Include relevant context and background information
- For fake articles, ensure the fictional elements are subtle and plausible
- Make fact-checking necessary to distinguish real from fake
- Avoid obvious patterns that could give away fake articles
- Return only valid JSON`;

type GenerateArticleParams = {
    language: Language;
    model: GenerativeModel;
    prompt: string;
    publishDate?: string;
    sourceCountry: Country;
};

const generateArticleFromPrompt = async ({
    language,
    model,
    prompt,
    publishDate,
    sourceCountry,
}: GenerateArticleParams): Promise<Article[]> => {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    if (!text) return [];

    const json = text.slice(text.indexOf('['), text.lastIndexOf(']') + 1);
    const articles = GeneratedArticleSchema.parse(JSON.parse(json));

    // Base date from publishDate or current time
    const baseDate = publishDate ? new Date(publishDate) : new Date();

    // Shuffle articles to randomize real/fake order
    const shuffledArticles = [...articles].sort(() => Math.random() - 0.5);

    // Add metadata to each article
    return shuffledArticles.map((article, index) => {
        const uniqueDate = new Date(baseDate);
        // Add index * 1 second to ensure unique timestamps
        uniqueDate.setSeconds(uniqueDate.getSeconds() + index);

        return {
            ...article,
            country: sourceCountry,
            createdAt: uniqueDate,
            id: crypto.randomUUID(),
            language,
        };
    });
};

export const generateArticles = async (language: Language = Language.en): Promise<Article[]> => {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
        const sourceCountry: Country = language === Language.en ? 'us' : 'fr';
        const realNews = await fetchRealNews({
            language,
            sourceCountry,
        });

        // Early return if no real news is available
        if (!realNews?.length) {
            console.warn(`No real news available for ${language} from ${sourceCountry}`);
            return [];
        }

        // Get articles from the last 2 weeks to avoid duplication
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        const articleRepository = getArticleRepository();
        const recentArticles = await articleRepository.findRecentArticles({
            country: sourceCountry,
            language,
            since: twoWeeksAgo,
        });

        // Shuffle and take a random selection of real news
        const newsToProcess = [...realNews].sort(() => Math.random() - 0.5).slice(0, 7);

        // Get the most recent publish date from available news items
        const publishDate = newsToProcess.reduce((latest, news) => {
            if (!news.publish_date) return latest;
            const date = new Date(news.publish_date);
            return !latest || date > latest ? date : latest;
        }, new Date());

        const prompt = generateMixedNewsPrompt(
            newsToProcess.map((news) => ({
                summary: news.summary ?? null,
                title: news.title,
            })),
            recentArticles,
            language,
        );

        const generatedArticles = await generateArticleFromPrompt({
            language,
            model,
            prompt,
            publishDate: publishDate.toISOString(),
            sourceCountry,
        });

        // Log generation stats for monitoring
        const realCount = generatedArticles.filter((a) => !a.isFake).length;
        const fakeCount = generatedArticles.filter((a) => a.isFake).length;
        console.log(
            `Generated ${generatedArticles.length} ${language} articles from ${sourceCountry} (${realCount} real, ${fakeCount} fake)`,
        );

        return generatedArticles;
    } catch (error) {
        console.error(`Failed to generate ${language} articles:`, error);
        throw error;
    }
};
