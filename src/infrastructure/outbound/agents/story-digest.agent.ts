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
    type StoryDigestAgentPort,
    type StoryDigestResult,
} from '../../../application/ports/outbound/agents/story-digest.agent.js';
import { type NewsStory } from '../../../application/ports/outbound/providers/news.port.js';

import { synopsisSchema } from '../../../domain/entities/story.entity.js';
import { Category } from '../../../domain/value-objects/category.vo.js';
import { categorySchema } from '../../../domain/value-objects/category.vo.js';
import { HolisticDigest } from '../../../domain/value-objects/perspective/holistic-digest.vo.js';
import { holisticDigestSchema } from '../../../domain/value-objects/perspective/holistic-digest.vo.js';
import {
    discourseTypeSchema,
    PerspectiveTags,
    stanceSchema,
} from '../../../domain/value-objects/perspective/perspective-tags.vo.js';

export class StoryDigestAgentAdapter implements StoryDigestAgentPort {
    static readonly NAME = 'StoryDigestAgent';

    static readonly SCHEMA = z.object({
        category: categorySchema,
        perspectives: z
            .array(
                z.object({
                    holisticDigest: holisticDigestSchema,
                    tags: z.object({
                        discourse_type: discourseTypeSchema,
                        stance: stanceSchema,
                    }),
                }),
            )
            .min(1, 'At least one perspective is required.')
            .max(2, 'No more than two perspectives should be created.'),
        synopsis: synopsisSchema,
    });

    static readonly SYSTEM_PROMPT = new SystemPromptAdapter(
        'You are a master investigative journalist and media analyst. Your core mission is to analyze news articles and deconstruct them into a structured intelligence brief, identifying the core facts and the distinct perspectives presented.',
        PROMPT_LIBRARY.PERSONAS.JOURNALIST,
        PROMPT_LIBRARY.FOUNDATIONS.CONTEXTUAL_ONLY,
        PROMPT_LIBRARY.LANGUAGES.ENGLISH_NATIVE,
        'CRITICAL: Output MUST be in English.',
        PROMPT_LIBRARY.TONES.NEUTRAL,
        PROMPT_LIBRARY.VERBOSITY.DETAILED,
    );

    private readonly agent: BasicAgentAdapter<z.infer<typeof StoryDigestAgentAdapter.SCHEMA>>;

    constructor(
        private readonly model: ModelPort,
        private readonly logger: LoggerPort,
    ) {
        this.agent = new BasicAgentAdapter(StoryDigestAgentAdapter.NAME, {
            logger: this.logger,
            model: this.model,
            schema: StoryDigestAgentAdapter.SCHEMA,
            systemPrompt: StoryDigestAgentAdapter.SYSTEM_PROMPT,
        });
    }

    static readonly USER_PROMPT = (newsStory: NewsStory) =>
        new UserPromptAdapter(
            // Core Mission
            'Analyze the following news articles about a single event and deconstruct them into a structured intelligence brief.',
            '',

            // The "What" - Required Output
            'Your output MUST contain two parts:',
            '1.  **Synopsis:** A comprehensive, neutral summary of the core facts. What happened, who was involved, where, and when. Prioritize factual completeness.',
            '2.  **Perspectives:** Identify the 1 or 2 most dominant perspectives presented in the articles. For each perspective, provide:',
            '    a.  **holisticDigest:** A detailed summary of that specific viewpoint.',
            "    b.  **tags:** Classify the perspective's `stance` and `discourse_type`.",
            '',

            // The "How" - Your Analysis Guidelines
            'Follow these analysis guidelines:',
            '•   **Be an Objective Analyst:** Do not judge the viewpoints, simply identify and categorize them based on the text.',
            '•   **Use These Discourse Definitions:**',
            '    -   **MAINSTREAM:** The dominant narrative that is seen widely across most major media outlets.',
            '    -   **ALTERNATIVE:** A viewpoint that is less defended or prevalent than the mainstream but still visible in public media.',
            '    -   (Do not use other discourse types for now).',
            '',

            // Critical Rules
            'CRITICAL RULES:',
            '•   Base your entire analysis **only** on the provided articles. Do not add external information.',
            '•   Identify a **maximum of 2** perspectives. Only create perspectives that are clearly distinct and present in the text.',
            '',

            // Data input
            'NEWS ARTICLES TO ANALYZE:',
            JSON.stringify(
                newsStory.articles.map((article) => ({
                    body: article.body,
                    headline: article.headline,
                })),
                null,
                2,
            ),
        );

    async run(params: { newsStory: NewsStory }): Promise<null | StoryDigestResult> {
        try {
            this.logger.info(
                `[${StoryDigestAgentAdapter.NAME}] Digesting story with ${params.newsStory.articles.length} articles`,
            );

            const result = await this.agent.run(
                StoryDigestAgentAdapter.USER_PROMPT(params.newsStory),
            );

            if (!result) {
                this.logger.warn(`[${StoryDigestAgentAdapter.NAME}] No result from AI model`);
                return null;
            }

            // Log successful parsing for debugging
            this.logger.info(
                `[${StoryDigestAgentAdapter.NAME}] Successfully parsed AI response with ${result.perspectives.length} perspectives`,
                {
                    category: result.category,
                    perspectiveTypes: result.perspectives.map((p) => p.tags.discourse_type),
                },
            );

            // Create value objects from AI response
            const category = new Category(result.category);

            // Create perspective data from AI response (without creating full Perspective entities)
            const perspectives = result.perspectives.map((perspectiveData) => ({
                holisticDigest: new HolisticDigest(perspectiveData.holisticDigest),
                tags: new PerspectiveTags({
                    discourse_type: perspectiveData.tags.discourse_type,
                    stance: perspectiveData.tags.stance,
                }),
            }));

            const digestResult: StoryDigestResult = {
                category,
                perspectives,
                synopsis: result.synopsis,
            };

            this.logger.info(
                `[${StoryDigestAgentAdapter.NAME}] Successfully digested story: ${digestResult.synopsis.substring(0, 100)}... with ${digestResult.perspectives.length} perspectives`,
            );

            return digestResult;
        } catch (error) {
            this.logger.error(`[${StoryDigestAgentAdapter.NAME}] Failed to digest story`, {
                articleCount: params.newsStory.articles.length,
                error,
            });
            return null;
        }
    }
}
