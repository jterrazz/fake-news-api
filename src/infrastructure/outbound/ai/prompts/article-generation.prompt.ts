import { Category, type Language } from '@prisma/client';
import { z } from 'zod';

import { type GenerateArticlesParams } from '../../../../application/ports/outbound/ai/article-generator.port.js';
import { ArticleSchema } from '../../../../domain/entities/article.js';
import { IntroductionPrompt } from './shared/introduction.prompt.js';

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

export class ArticleGenerationPrompt {
    private static formatNewsItem(index: number, title: string, summary: string | null): string {
        const baseText = `${index + 1}. "${title}"`;
        return summary ? baseText + ` (Context: ${summary})` : baseText;
    }

    private static formatNewsItems(items: Array<{ title: string; summary: string | null }>) {
        return items.map((item, i) => this.formatNewsItem(i, item.title, item.summary)).join('\n');
    }

    private static formatRecentArticle(index: number, headline: string, summary: string): string {
        return `${index + 1}. "${headline}" - ${summary}`;
    }

    private static formatRecentArticles(items: Array<{ headline: string; summary: string }>) {
        return items
            .map((item, i) => this.formatRecentArticle(i, item.headline, item.summary))
            .join('\n');
    }

    public static readonly responseSchema = GeneratedArticleSchema;

    public static generate({
        sourceArticles,
        recentArticles,
        language,
    }: GenerateArticlesParams): string {
        return `${IntroductionPrompt.GAME_CONTEXT}

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
${this.formatNewsItems(sourceArticles)}

Recently generated articles to avoid duplicating:
${this.formatRecentArticles(recentArticles)}

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
    }
}
