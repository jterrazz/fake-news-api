import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { type GenerateArticlesParams } from '../../../../application/ports/outbound/ai/article-generator.port.js';

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

import { IntroductionPrompt } from './shared/introduction.prompt.js';

/**
 * Base interface for all AI content generators
 */
export interface AIContentGenerator<TInput, TOutput> {
    readonly answerSchema: z.ZodSchema<TOutput>;
    generateInstructions(params: TInput): string;
}

/**
 * Raw article data generated by AI before domain entity creation
 */
// TODO Move to port values
// TODO BUt make this generic instead get the value from the schema directly
export interface GeneratedArticleData {
    headline: ArticleHeadline;
    content: ArticleContent;
    summary: ArticleSummary;
    category: ArticleCategory;
    fakeStatus: ArticleFakeStatus;
}

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

/**
 * Schema for generated articles from AI with transformations to domain objects
 */
const generatedArticleSchema = z.array(
    rawArticleSchema.transform((data) => ({
        category: ArticleCategory.create(data.category),
        content: ArticleContent.create(data.contentInMarkdown),
        fakeStatus: data.isFake
            ? ArticleFakeStatus.createFake(data.fakeReason!)
            : ArticleFakeStatus.createNonFake(),
        headline: ArticleHeadline.create(data.headline),
        summary: ArticleSummary.create(data.summary),
    })),
) as unknown as z.ZodSchema<GeneratedArticleData[]>;

/**
 * Article content generator class
 */
export class ArticleGeneratorPrompt
    implements AIContentGenerator<GenerateArticlesParams, GeneratedArticleData[]>
{
    public readonly answerSchema = generatedArticleSchema;

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

    public generateInstructions({
        articles: { news, publicationHistory },
        language,
        count,
    }: GenerateArticlesParams): string {
        const languageLabel = language.toString();

        return `${IntroductionPrompt.GAME_CONTEXT}

Generate exactly ${count} news articles in total, with a balanced mix of genuine and fictional articles.

## CRITICAL REQUIREMENTS:
1. NEVER reveal in the article content whether it's fake or real. The 'isFake' flag is ONLY for internal game mechanics.
2. ALL articles must be written in an authentic journalistic style regardless of their truth status.
3. The writing style and quality should be IDENTICAL between fake and real articles.
4. Users must rely solely on their critical thinking to identify fake content - there should be NO linguistic clues.
5. IMPORTANT: Use ONLY the provided real-world headlines as your source of factual information. DO NOT rely on your internal knowledge about current events, politicians, or world affairs.

## Content Guidelines:
- Headlines: Clear, concise, 8-12 words, journalistic tone
- Content: EXACTLY 80-100 words in proper markdown format
- Language: All content must be in ${languageLabel}
- Structure: Professional newspaper style with proper paragraphs
- Category: Assign each article to one of these categories: politics, technology, science, health, entertainment, sports, business, world. If content doesn't clearly fit into any of these categories, use "other" as the category value.
- Quotes usage:
  * For REAL articles: DO NOT INVENT quotes. Only include quotes if they are verifiable facts from the original headlines.
  * For ALL articles: Use quotes sparingly - at most one quote per article if necessary.
  * When including quotes, attribute them to specific, relevant sources.
- Markdown usage:
  * Format quotes with > blockquotes when appropriate
  * Use **bold** ONLY for emphasizing key concepts (not for signaling fake content)
  * Create bullet points with - for lists when necessary
  * Include [text](url) format for references when relevant
  * Separate paragraphs with two newlines
- Summary: Create informative summaries that accurately represent the article's content and reveal its authenticity status. This field will be used by future AIs to understand the history of the newspaper (latest fake and real articles). Encode it in a way that will pass the maximum amount of information for the future AIs generators.

## Knowledge Base:
- USE ONLY the "Original real world headlines" section below as your factual knowledge source
- DO NOT use any information outside of what is explicitly provided in these headlines
- If the headlines don't mention a topic, DO NOT make assumptions based on your training data
- For names of politicians, world leaders, companies, and other entities, ONLY use those explicitly mentioned in the provided headlines

## Output Format:
Direct output the JSON (like a direct JSON.stringify output) following the schema: ${this.getSchemaDescription()}

## Content Strategy:
For REAL articles:
- Base articles EXCLUSIVELY on information from the provided real-world headlines
- Accurately represent factual events while maintaining reader engagement
- Rephrase original headlines while preserving the core message
- Include relevant factual context ONLY if it's present in the provided headlines
- Maintain journalistic integrity and factual accuracy
- NEVER fabricate quotes or statements from real people or organizations
- DO NOT incorporate facts from your training data that aren't in the provided headlines

For FICTIONAL articles:
- Create plausible fictional stories that build upon the SAME real-world headlines provided
- Introduce fictional elements ONLY as extensions or twists to the facts in the provided headlines
- Base fictional content on actual trends, organizations, and public figures MENTIONED in the headlines
- Ensure fictional elements require fact-checking to identify
- Maintain the same level of detail, style, and credibility as real articles
- NEVER include obvious fabrications or claims that would immediately seem implausible
- CRITICAL: The content should NOT self-identify as fake through hints, exaggerations, or stylistic differences

======

Original real world headlines for inspiration:
${JSON.stringify(news)}

Past generated articles to maintain consistency:
${JSON.stringify(publicationHistory)}`;
    }
}
