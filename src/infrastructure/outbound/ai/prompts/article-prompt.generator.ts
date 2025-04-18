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
        const NEWS_KEY = '"RealWorldNews"';
        const HISTORY_KEY = '"ArticlesAlreadyPublishedInTheGame"';

        return {
            query: `Your job is to create articles for a "Spot the Fake News" game where the player will read articles and try to spot which ones are fake.

## Core Requirements:
- Generate exactly ${count} news articles in total, mixing genuine and fictional articles.
- All articles should be believable and derived from current events.
- Write each article professionally in the same style as would Reuters, BBC, etc, maintaining identical writing quality all articles.
- Maintain a strictly neutral and impartial journalistic tone, presenting facts without any inherent bias, even when source materials might lean one way or another. The game should subtly demonstrate how news can be manipulated to appeal to different political ideologies, reflecting real-world patterns where both far-left and far-right groups might interpret or twist information to support their narratives.
- If needed, give a short general context in each article (without explicitly saying context, but like a journalistic would introduce a subject to readers that are not familiar with the topic)
- Never reveal if an article is fake/real in its content
- Use ONLY the provided news ${NEWS_KEY} as the source of current events happening in the world
- Multiple articles could eventually cover different angles of the same story if you think it's interesting

In order to create a dynamic and engaging news feed experience:
- Order articles thoughtfully as they will be read sequentially by users in the same order they are generated
- Order distribution of real/fake articles unpredictably
- Vary the distribution of real/fake articles unpredictably
- Mix article categories strategically to maintain reader interest
- Create thematic connections between some articles while keeping others independent

## Article Guidelines:
For REAL articles:
- Never fabricate information
- You can simplify original news while focusing on interesting points
- Strip away any existing bias from source materials
- Use neutral language that avoids loaded terms or implicit judgments

For FAKE articles:
- Build upon the up to date real news
- Create alterations that you think are interesting and engaging
- Mimic real media bias and clickbait tactics
- Maybe avoid obvious fabrications, but don't be afraid to make some creative twists
- When applicable, demonstrate how factual information can be subtly reframed to appeal to any political biases, left or right
- Do not base fake news based on super small details, try to create believable fake news
- For SOME of the fake news, you can use a "The Babylon Bee" style of fake news

## Format:
- Headline: 8-14 words
- Content: Around 40-70 words encoded in markdown
- Language: ${languageLabel}

## Markdown Capabilities:
- If needed, use **bold** for better readability
- If needed, use two newlines between paragraphs
- Annotate each fake information in the content with a metadata annotation formatted as %%[some fake information](an annotation about why this information is fake)
  Example: "SpaceX successfully launched its latest mission to Mars, but %%[the spacecraft carried 12 astronauts on board](SpaceX's current Mars missions are uncrewed - they have not yet sent humans to Mars)"
- Each piece of misleading or false information MUST be wrapped in the %% format: %%[fake content](explanation). This special markup will allow the game to visually highlight these sections when revealing the truth to players
- Metadata annotations in %% format don't count towards word limits.
- Keep metadata annotations concise and factual

## Summary Field:
Create an informative summary that will be used in future generations in the field ${HISTORY_KEY}
- Reveals the article's authenticity status
- Captures key information that will help the AI in future generations: it will avoir duplicated ideas and will be used to create a good article feed

## Knowledge Base:
Here is the source of current events happening in the world:

"${NEWS_KEY}":
${JSON.stringify(news, null, 2)}

Here is the list of articles already published in the game:

"${HISTORY_KEY}":
${JSON.stringify(publicationHistory, null, 2)}

## Output Format:
Direct output the JSON (a direct JSON.stringify output) following the schema: ${JSON.stringify(generatedSchemaDescription, null, 2)}`,
            responseSchema: generatedArticleArraySchema,
        };
    }
}
