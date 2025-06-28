import {
    BasicAgentAdapter,
    type ModelPort,
    PROMPT_LIBRARY,
    SystemPromptAdapter,
    UserPromptAdapter,
} from '@jterrazz/intelligence';
import { type LoggerPort } from '@jterrazz/logger';
import { z } from 'zod/v4';

import {
    type ArticleComposerAgentPort,
    type ArticleCompositionInput,
    type ArticleCompositionResult,
} from '../../../application/ports/outbound/agents/article-composer.agent.js';

import { bodySchema } from '../../../domain/value-objects/article/body.vo.js';
import { headlineSchema } from '../../../domain/value-objects/article/headline.vo.js';
import { Category } from '../../../domain/value-objects/category.vo.js';
import { categorySchema } from '../../../domain/value-objects/category.vo.js';

export class ArticleComposerAgentAdapter implements ArticleComposerAgentPort {
    static readonly NAME = 'ArticleComposerAgent';

    static readonly SCHEMA = z.object({
        body: bodySchema,
        category: categorySchema,
        // Main article (neutral, factual)
        headline: headlineSchema,
        // Variants (perspective-based viewpoints)
        variants: z
            .array(
                z.object({
                    body: bodySchema,
                    discourse: z.enum(['mainstream', 'alternative', 'underreported', 'dubious']),
                    headline: headlineSchema,
                    stance: z.enum([
                        'supportive',
                        'critical',
                        'neutral',
                        'mixed',
                        'concerned',
                        'optimistic',
                        'skeptical',
                    ]),
                }),
            )
            .min(0)
            .max(3)
            .describe('Article variants representing different viewpoints, max 3 variants'),
    });

    static readonly SYSTEM_PROMPT = new SystemPromptAdapter(
        'You are an expert content composer and journalistic writer. Your mission is to transform structured story data into compelling articles: a neutral main article presenting only facts, plus variants representing different viewpoints.',
        PROMPT_LIBRARY.PERSONAS.JOURNALIST,
        PROMPT_LIBRARY.FOUNDATIONS.CONTEXTUAL_ONLY,
        PROMPT_LIBRARY.TONES.NEUTRAL,
        PROMPT_LIBRARY.VERBOSITY.DETAILED,
    );

    private readonly agent: BasicAgentAdapter<z.infer<typeof ArticleComposerAgentAdapter.SCHEMA>>;

    constructor(
        private readonly model: ModelPort,
        private readonly logger: LoggerPort,
    ) {
        this.agent = new BasicAgentAdapter(ArticleComposerAgentAdapter.NAME, {
            logger: this.logger,
            model: this.model,
            schema: ArticleComposerAgentAdapter.SCHEMA,
            systemPrompt: ArticleComposerAgentAdapter.SYSTEM_PROMPT,
        });
    }

    static readonly USER_PROMPT = (input: ArticleCompositionInput) =>
        new UserPromptAdapter(
            // Language requirement (dynamic based on target)
            `CRITICAL: Output MUST be in ${input.targetLanguage.toString().toUpperCase()} language.`,

            // Main objective
            'Your goal is to compose articles from the provided story data:',
            '1. MAIN ARTICLE: Neutral, factual content that presents only facts without taking sides',
            '2. ARTICLE VARIANTS: Different viewpoints based on the perspectives, with editorial freedom to improve them',

            // Main article guidelines
            'MAIN ARTICLE COMPOSITION:',
            '• Write a completely neutral main article body that presents only factual information',
            '• Do NOT favor any perspective or take any sides in the main article',
            '• Present events, facts, and statements objectively',
            '• Use clear, professional language appropriate for all readers',
            '• Focus on "what happened" rather than interpretations or opinions',
            '• Create a headline that accurately captures the main facts',

            // Variants guidelines
            'ARTICLE VARIANTS COMPOSITION:',
            '• Create variants based on the provided perspectives, but use your editorial judgment',
            '• Each variant should represent a specific viewpoint (stance + discourse)',
            '• Use the perspectives as guidance but improve the content for clarity and impact',
            '• Each variant can have its own headline that reflects that particular viewpoint',
            '• Write each variant to appeal to readers who hold that particular perspective',
            '• Maintain factual accuracy while presenting the viewpoint compellingly',

            // Content requirements
            'CONTENT REQUIREMENTS:',
            '• Main article: 150-300 words of neutral, factual content',
            '• Each variant: 100-250 words presenting that specific viewpoint',
            '• Headlines: 60-80 characters, accurate and compelling',
            '• Use the target language throughout all content',

            // Editorial guidance
            'EDITORIAL APPROACH:',
            '• The provided perspectives are guidance - improve them with your editorial expertise',
            '• Prioritize reader comprehension and engagement',
            '• Ensure each variant authentically represents its intended viewpoint',
            '• Balance factual accuracy with viewpoint representation',
            '• Create content that serves readers seeking that particular perspective',

            // Critical rules
            'CRITICAL RULES:',
            '• Base all content on the provided story data as primary source',
            '• Do NOT add information not present in the source story',
            '• Main article must remain completely neutral and factual',
            '• Variants can be perspective-driven but must remain factually accurate',
            '• Create only honest content - no misleading information',

            // Story data input
            'STORY DATA FOR COMPOSITION:',
            JSON.stringify(
                {
                    dateline: input.story.dateline.toISOString(),
                    perspectives: input.story.perspectives.map((perspective) => ({
                        digest: perspective.holisticDigest.value,
                        discourse: perspective.tags.tags.discourse_type,
                        stance: perspective.tags.tags.stance,
                    })),
                    synopsis: input.story.synopsis,
                },
                null,
                2,
            ),
            '',
            'NOTE: Create a neutral main article plus variants that authentically represent different viewpoints while maintaining factual accuracy.',
        );

    async run(input: ArticleCompositionInput): Promise<ArticleCompositionResult | null> {
        try {
            this.logger.info(
                `[${ArticleComposerAgentAdapter.NAME}] Composing article for story with ${input.story.perspectives.length} perspectives`,
                {
                    country: input.targetCountry.toString(),
                    language: input.targetLanguage.toString(),
                    storyCategory: input.story.category.toString(),
                },
            );

            const result = await this.agent.run(ArticleComposerAgentAdapter.USER_PROMPT(input));

            if (!result) {
                this.logger.warn(`[${ArticleComposerAgentAdapter.NAME}] No result from AI model`);
                return null;
            }

            // Log successful composition for debugging
            this.logger.info(
                `[${ArticleComposerAgentAdapter.NAME}] Successfully composed article with variants`,
                {
                    bodyLength: result.body.length,
                    category: result.category,
                    headlineLength: result.headline.length,
                    variantsCount: result.variants.length,
                },
            );

            // Create value objects from AI response
            const category = new Category(result.category);

            const compositionResult: ArticleCompositionResult = {
                body: result.body,
                category,
                headline: result.headline,
                variants: result.variants.map((variant) => ({
                    body: variant.body,
                    discourse: variant.discourse,
                    headline: variant.headline,
                    stance: variant.stance,
                })),
            };

            this.logger.info(
                `[${ArticleComposerAgentAdapter.NAME}] Successfully composed article: "${compositionResult.headline}" (${compositionResult.body.length} chars) with ${compositionResult.variants.length} variants`,
            );

            return compositionResult;
        } catch (error) {
            this.logger.error(`[${ArticleComposerAgentAdapter.NAME}] Failed to compose article`, {
                error,
                storyId: input.story.id,
                targetCountry: input.targetCountry.toString(),
                targetLanguage: input.targetLanguage.toString(),
            });
            return null;
        }
    }
}
