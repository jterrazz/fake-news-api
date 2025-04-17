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
const generatedArticleSchema = z.object({
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
const generatedSchemaDescription = zodToJsonSchema(z.array(generatedArticleSchema), {
    $refStrategy: 'none',
    definitionPath: 'schemas',
});

type GeneratedArticle = {
    category: ArticleCategory;
    content: ArticleContent;
    fakeStatus: ArticleFakeStatus;
    headline: ArticleHeadline;
    summary: ArticleSummary;
};

/**
 * Schema for generated articles from AI with transformations to domain objects
 */
const generatedArticleArraySchema = z.array(
    generatedArticleSchema.transform((item) => ({
        category: ArticleCategory.create(item.category),
        content: ArticleContent.create(item.contentInMarkdown),
        fakeStatus: item.isFake
            ? ArticleFakeStatus.createFake(item.fakeReason!)
            : ArticleFakeStatus.createNonFake(),
        headline: ArticleHeadline.create(item.headline),
        summary: ArticleSummary.create(item.summary),
    })),
) as unknown as z.ZodType<GeneratedArticle[]>;

/**
 * Article content generator class
 */
export class ArticlePromptGenerator
    implements AIPromptGenerator<GenerateArticlesParams, GeneratedArticle[]>
{
    /**
     * Generates a prompt for the AI
     * @param params The parameters for the prompt
     * @returns The prompt
     */
    public generatePrompt({
        articles: { news, publicationHistory },
        count,
        language,
    }: GenerateArticlesParams): AIPrompt<GeneratedArticle[]> {
        const languageLabel = language.toString();

        return {
            query: `${SHARED_CONTEXT_PROMPT}

Generate exactly ${count} news articles in total, mixing genuine and fictional articles. Each article should be SHORT (30-70 words) and focus on simple key points that are verifiable, while maintaining a journalistic tone and feel.

Context: These articles are part of a larger game news publication, where the player can read them and try to spot the fake ones. It's important to maintain a journalistic tone and feel, while making the articles easy to read and understand. And the game enjoyable.

## Core Requirements:
1. Start each article with a one-sentence context
2. Never reveal if an article is fake/real in its content
3. Maintain identical writing quality for both real and fake articles
4. Use ONLY the provided real-world news as source material
5. Multiple articles can cover different angles of the same story

## Article Guidelines:
For REAL articles:
- Simplify original news while keeping core facts accurate
- Never fabricate quotes or statements
- Focus on one verifiable claim

For FAKE articles:
- Build upon real news with plausible twists
- Create subtle, believable alterations
- Mimic real media bias and clickbait tactics
- Avoid obvious fabrications

## Format:
- Headline: 3-10 words, journalistic style
- Context: One sentence background, used to help the AI understand the published article in future generations
- Content: 30-50 words in markdown
- Language: ${languageLabel}
- Category: politics, technology, science, health, entertainment, sports, business, world, or other

## Markdown Usage:
- **bold** for key concepts only
- Two newlines between paragraphs

## Summary Field:
Create an informative summary that:
- Reveals the article's authenticity status
- Captures key information for AI history tracking
- Helps maintain consistency across articles in future generations

## Knowledge Base:
Use ONLY the news provided below:

Original real world news for inspiration:
${JSON.stringify(news, null, 2)}

Past generated articles for information to maintain consistency:
${JSON.stringify(publicationHistory, null, 2)}

## Output Format:
Direct output the JSON (a direct JSON.stringify output) following the schema: ${JSON.stringify(generatedSchemaDescription, null, 2)}`,
            responseSchema: generatedArticleArraySchema,
        };
    }
}
