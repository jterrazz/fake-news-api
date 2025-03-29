import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { type GenerateArticlesParams } from '../../../../application/ports/outbound/ai/article-generator.port.js';
import {
    AIPrompt,
    AIPromptGenerator,
} from '../../../../application/ports/outbound/ai/prompt.port.js';

import {
    ArticleCategory,
    categorySchema,
} from '../../../../domain/value-objects/article-category.vo.js';
import {
    ArticleContent,
    contentSchema,
} from '../../../../domain/value-objects/article-content.vo.js';
import { ArticleFakeStatus } from '../../../../domain/value-objects/article-fake-status.vo.js';
import {
    ArticleHeadline,
    headlineSchema,
} from '../../../../domain/value-objects/article-headline.vo.js';
import {
    ArticleSummary,
    summarySchema,
} from '../../../../domain/value-objects/article-summary.vo.js';

import { SHARED_CONTEXT_PROMPT } from './shared/context-prompt.js';

/**
 * Raw input schema for AI responses before transformation
 */
const rawArticleSchema = z.object({
    category: categorySchema.describe(
        'The category of the article that strictly matches the category enum',
    ),
    contentInMarkdown: contentSchema.describe('The content of the article in markdown format.'),
    fakeReason: z
        .string()
        .nullable()
        .default(null)
        .describe(
            'If isFake is false, this field MUST be null. If isFake is true, this field MUST be a string with the reason why the article is fake.',
        ),
    headline: headlineSchema.describe('The headline of the article'),
    isFake: z.boolean().default(false).describe('Whether the article is fake or not'),
    summary: summarySchema.describe('The summary of the article'),
});

type GeneratedArticleData = {
    category: ArticleCategory;
    content: ArticleContent;
    fakeStatus: ArticleFakeStatus;
    headline: ArticleHeadline;
    summary: ArticleSummary;
};

/**
 * Schema for generated articles from AI with transformations to domain objects
 */
const generatedArticleSchema = z.array(rawArticleSchema).transform((data) =>
    data.map((item) => ({
        category: ArticleCategory.create(item.category),
        content: ArticleContent.create(item.contentInMarkdown),
        fakeStatus: item.isFake
            ? ArticleFakeStatus.createFake(item.fakeReason!)
            : ArticleFakeStatus.createNonFake(),
        headline: ArticleHeadline.create(item.headline),
        summary: ArticleSummary.create(item.summary),
    })),
) as unknown as z.ZodType<GeneratedArticleData[]>;

/**
 * Article content generator class
 */
export class ArticlePromptGenerator
    implements AIPromptGenerator<GenerateArticlesParams, GeneratedArticleData[]>
{
    /**
     * Returns the raw input schema expected from the AI,
     * before any transformations are applied
     */
    private getRawInputSchema() {
        return z.array(rawArticleSchema);
    }

    /**
     * Returns a human-readable description of the schema structure
     */
    private getSchemaDescription() {
        const jsonSchema = zodToJsonSchema(this.getRawInputSchema(), {
            $refStrategy: 'none',
            definitionPath: 'schemas',
        });

        return JSON.stringify(jsonSchema, null, 2);
    }

    public generatePrompt({
        articles: { news, publicationHistory },
        language,
        count,
    }: GenerateArticlesParams): AIPrompt<GeneratedArticleData[]> {
        const languageLabel = language.toString();

        return {
            query: `${SHARED_CONTEXT_PROMPT}

Generate exactly ${count} news articles in total, with a balanced mix of genuine and fictional articles.

## CRITICAL REQUIREMENTS:
1. NEVER reveal in the article content whether it's fake or real. The 'isFake' and 'fakeReason' and 'summary' fields are the ONLY fields to indicate the truthfulness of the article.
2. ALL articles must be written in an authentic journalistic style regardless of their truth status.
3. The writing style and quality should be IDENTICAL between fake and real articles.
4. Users must rely solely on their critical thinking to identify fake content - there should be NO linguistic clues.
5. IMPORTANT: Use ONLY the provided real-world news as your source of factual information. Your internal knowledge about current events, politicians, or world affairs might be outdated, and few months old.

## Output Content Guidelines:
- Healine: Clear, concise, 8-15 words, journalistic tone
- Content: EXACTLY 60-110 words in proper markdown format
- Language: All content must be in ${languageLabel}
- Structure: Professional newspaper style with proper paragraphs
- Category: Assign each article to one of these categories: politics, technology, science, health, entertainment, sports, business, world. If content doesn't clearly fit into any of these categories, use "other" as the category value.
- Quotes usage:
  * For REAL articles: DO NOT INVENT quotes. Only include quotes if they are verifiable facts from the original news.
  * For ALL articles: Use quotes sparingly - at most one quote per article if necessary.
  * When including quotes, attribute them to specific, relevant sources.
- Markdown usage:
  * Format quotes with > blockquotes when appropriate
  * Use **bold** ONLY for emphasizing key concepts (not for signaling fake content)
  * Create bullet points with - for lists when necessary
  * Include [text](url) format for references when relevant
  * Separate paragraphs with two newlines
- Summary: Create informative summaries that accurately represent the article's content and reveal its authenticity status. This field will be used by AIs to understand quickly the history of the newspaper (latest fake and real articles). Encode it in a way that will pass the maximum amount of information for future AIs.

## Knowledge Base:
- USE ONLY the "Original real world news for inspiration" section below as your factual knowledge source for up to date news
- Try NOT to use too much information outside of what is explicitly provided in these news, as the news are the up to date source of truth

## Output Format:
Direct output the JSON (like a direct JSON.stringify output) following the schema: ${this.getSchemaDescription()}

## Content Strategy:
For REAL articles:
- Rephrase original news to achieve quick readability while preserving the core message
- Accurately represent factual events while maintaining reader engagement
- NEVER fabricate quotes or statements from real people or organizations

For FICTIONAL articles:
- Create plausible fictional stories that build upon the SAME real-world news provided
- Introduce fictional elements ONLY as extensions or twists to the facts in the provided news
- Act like a "fake news" social media account or publication would do in the real world
- Respect all sides of the political spectrum, and try to find how biased media would have taken advantage of the news to be more engaging and clickbait than reality
- Maintain the same level of detail, style, and credibility as real articles
- NEVER include obvious fabrications or claims that would immediately seem implausible
- CRITICAL: The content should NOT self-identify as fake through hints, exaggerations, or stylistic differences

======

Original real world news for inspiration:
${JSON.stringify(news)}

Past generated articles to maintain consistency:
${JSON.stringify(publicationHistory)}`,
            responseSchema: generatedArticleSchema,
        };
    }
}
