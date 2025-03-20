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
    contentInMarkdown: contentSchema.describe(
        'The content of the article in markdown format. MUST use proper markdown syntax including: ' +
            '- for lists, > for quotes, **bold** for emphasis, ' +
            '[text](url) for links, and two newlines between paragraphs. Include between 1-3 paragraphs ' +
            'with proper markdown formatting.',
    ),
    fakeReason: z.string().nullable().default(null).describe('The reason why the article is fake'),
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

Generate exactly ${count} articles in total, with a nice balance between fake and real articles.

For REAL articles:
- Use headlines that capture the essence of the original but rephrase them to keep consistency in the app
- Add interesting factual details that make the story engaging, and the app fun to play
- Include relevant context and factual background, if you're certain about it

For FICTIONAL articles (generate a nice balance between fake and real articles):
- Base fake stories on current real events and trends from the original real world headlines
- Include accurate names of real organizations, places, and public figures
- Create plausible extensions or developments of real current events
- Add twists that require fact-checking to disprove
- Make the fictional elements logically consistent with current reality
- Avoid sensational or outlandish claims that would immediately raise suspicion
- Use realistic quotes and statistics that seem credible
- Keep the story within the realm of possibility given the current context

======

Original real world headlines to draw inspiration from:
${JSON.stringify(news)}

Past generated articles in my app to keep the consistency:
${JSON.stringify(publicationHistory)}

Important guidelines:
- Headlines should be clear and around 8-12 words long
- Write all content in the output JSON in ${languageLabel}
- Use proper journalistic style and structure
- For the contentInMarkdown field, you MUST use proper markdown formatting:
  * Format quotes with > blockquotes
  * Use **bold** for emphasis on key points
  * Create bullet points with - for lists
  * Include [text](url) format for any references
  * Separate paragraphs with two newlines
  * Include at least one quote and one list in each article
- The summary field will be used by future AIs to understand the history of the newspaper (latest fake and real articles). Encode it in a way that will pass the maximum amount of information for the future AIs generators.

Direct output the JSON (like a JSON.stringify output) in the following format: ${this.getSchemaDescription()}. Give me directly the JSON object.`;
    }
}
