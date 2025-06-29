import { z } from 'zod/v4';

import { type ArticleGenerationParams } from '../../../../application/ports/outbound/ai/article-generator.port.js';
import {
    type AIPrompt,
    type AIPromptGenerator,
} from '../../../../application/ports/outbound/ai/prompt.port.js';

import { Authenticity } from '../../../../domain/value-objects/article/authenticity.vo.js';
import { Body, bodySchema } from '../../../../domain/value-objects/article/body.vo.js';
import { Headline, headlineSchema } from '../../../../domain/value-objects/article/headline.vo.js';
import { Summary, summarySchema } from '../../../../domain/value-objects/article/summary.vo.js';
import { Category, categorySchema } from '../../../../domain/value-objects/category.vo.js';

/**
 * Raw input schema for AI responses before transformation
 */
const generatedArticleSchema = z.object({
    bodyInMarkdown: bodySchema.describe('The body of the article in markdown format.'),
    category: categorySchema.describe(
        'The category of the article that strictly matches the category enum',
    ),
    fakeReason: z
        .string()
        .nullable()
        .default(null)
        .describe(
            'If isFake is false, this field MUST be null. If isFake is true, this field MUST be the reason why the article is fake. This field will be read by the player to understand why the article is fake. So make the explanation clear, explaining why it was fake, and what the real truth events are.',
        ),
    headline: headlineSchema.describe('The headline of the article'),
    isFake: z.boolean().default(false).describe('Whether the article is fake or not'),
    summary: summarySchema.describe('The summary of the article'),
});

/**
 * Schema for generated articles from AI with transformations to domain objects
 */
const generatedSchemaDescription = z.toJSONSchema(z.array(generatedArticleSchema));

type GeneratedArticle = {
    authenticity: Authenticity;
    body: Body;
    category: Category;
    headline: Headline;
    summary: Summary;
};

/**
 * Schema for generated articles from AI with transformations to domain objects
 */
const generatedArticleArraySchema = z.array(
    generatedArticleSchema.transform((item) => ({
        authenticity: new Authenticity(item.isFake, item.fakeReason),
        body: new Body(item.bodyInMarkdown),
        category: new Category(item.category),
        headline: new Headline(item.headline),
        summary: new Summary(item.summary),
    })),
) as unknown as z.ZodType<GeneratedArticle[]>;

const NEWS_KEY = '"RealWorldNews"';
const HISTORY_KEY = '"ArticlesAlreadyPublishedInTheGame"';

/**
 * Article content generator class
 */
export class ArticlePromptGenerator
    implements AIPromptGenerator<ArticleGenerationParams, GeneratedArticle[]>
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
    }: ArticleGenerationParams): AIPrompt<GeneratedArticle[]> {
        const languageLabel = language.toString();

        const systemPrompt = getArticleSystemPrompt(languageLabel);
        const dynamicPrompt = `Generate exactly ${count} news articles in total, mixing genuine and fictional articles.
        
## Knowledge Base:
Here is the source of current events happening in the world (only consider the articles that you find interesting and engaging for a general audience):
${NEWS_KEY}:
${JSON.stringify(news, null, 2)}

Here is the list of articles already published in the game:
${HISTORY_KEY}:
${JSON.stringify(publicationHistory, null, 2)}`;
        return {
            messages: [
                { cache: true, content: systemPrompt, role: 'system' },
                { content: dynamicPrompt, role: 'user' },
            ],
            responseSchema: generatedArticleArraySchema,
        };
    }
}

/**
 * Returns the static system prompt for article generation (cacheable)
 */
export function getArticleSystemPrompt(languageLabel: string): string {
    return `Your job is to create articles for a "Spot the Fake News" game where the player will read articles and try to spot which ones are fake.

## Core Requirements:
- All articles should be believable and inspired from the given current events. Article should fit in the real current timeline of events
- Write each article professionally in the same style as would Reuters, BBC, etc, maintaining identical writing quality all articles.
- Maintain a strictly neutral and impartial journalistic tone, presenting facts without any inherent bias, even when source materials might lean one way or another. The game should subtly demonstrate how news can be manipulated to appeal to different political ideologies, reflecting real-world patterns where both far-left and far-right groups might interpret or twist information to support their narratives.
- If needed, give a short general context in each article (without explicitly saying context, but like a journalistic would introduce a subject to readers that are not familiar with the topic)
- Never reveal if an article is fake/real in its body
- Use ONLY the provided news ${NEWS_KEY} as the source of current events happening in the world
- Multiple articles could eventually cover different angles of the same story if you think it's interesting
- Double check if the field isFake is correctly set
- You're allowed to use X / Twitter as a source of up to date information, and for contradictory information, balancing official mainstream media sources, and also more silenced / alternative sources.

In order to create a dynamic and engaging news feed experience:
- The articles will be read by the player in the same order they are generated.
- The choice of fake/real articles MUST BE RANDOM / UNPREDICTABLE (in count, and in order).
- Do not create duplicated articles talking about the exact same story.

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
- You can use a "The Babylon Bee" / "The Onion" style of funny article for 20% of the fake articles.

## Format:
- Headline: 8-16 words
- Body: Around 40-100 words encoded in markdown
- Language: All generated text, summary, etc etc MUST be in ${languageLabel} (but enums must still follow the given enum values)

## Markdown Capabilities:
- If needed, use **bold** for better readability
- If needed, use two newlines between paragraphs

## Markdown Annotations:
- Annotate each fake information in the "body" field with a metadata annotation
- The format is %%[the annotated information](the annotation): only %%[]() but do not put a %% in the end
  Example: "SpaceX successfully launched its latest mission to Mars, but %%[the spacecraft carried 12 astronauts on board](SpaceX's current Mars missions are uncrewed - they have not yet sent humans to Mars)"
- You can still use **bold** for the "the annotated information" part if some fake information is bolded in the original body.
- The ENTIRE false information in the body MUST be annotated. DO NOT leave any false information unannotated. So do not hesitate to use large sections of it, and even annotate the entire body if needed.
- This will allow the game to visually highlight these sections when revealing the truth to players.
- Metadata annotations don't count towards word limits.
- Keep metadata annotations concise and factual

## Summary Field:
Create an informative summary that will be used in future generations in the field ${HISTORY_KEY}
- Reveals the article's authenticity status
- Captures key information that will help the AI in future generations: it avoids duplicated ideas and will be used for a good article feed

## Output Format:
- Directly give me a JSON (like a JSON.stringify output) following the schema: ${JSON.stringify(generatedSchemaDescription, null, 2)}`;
}
