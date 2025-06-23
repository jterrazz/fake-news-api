import {
    BasicAgentAdapter,
    type ModelPort,
    PROMPT_LIBRARY,
    SystemPromptAdapter,
    UserPromptAdapter,
} from '@jterrazz/intelligence';
import { type LoggerPort } from '@jterrazz/logger';
import { randomUUID } from 'crypto';
import { z } from 'zod/v4';

import { type StoryDigestAgentPort } from '../../../application/ports/outbound/agents/story-digest.agent.js';
import { type NewsStory } from '../../../application/ports/outbound/providers/news.port.js';

import { Perspective } from '../../../domain/entities/perspective.entity.js';
import { Story, synopsisSchema } from '../../../domain/entities/story.entity.js';
import { Category } from '../../../domain/value-objects/category.vo.js';
import { categorySchema } from '../../../domain/value-objects/category.vo.js';
import { Country } from '../../../domain/value-objects/country.vo.js';
import { countrySchema } from '../../../domain/value-objects/country.vo.js';
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
        countries: z.array(countrySchema),
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
            .max(4, 'No more than four perspectives should be created.'),
        synopsis: synopsisSchema,
    });

    static readonly SYSTEM_PROMPT = new SystemPromptAdapter(
        'You are a master investigative journalist and media analyst. Your core mission is to classify information from news articles into predefined discourse types. Your analysis must be objective and based solely on the provided text.',
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
            'Your goal is to create a structured brief for a writer by sorting information from news articles into its correct discourse category. This allows the writer to understand how the story is being presented across different types of media.',
            'First, identify the dominant, mainstream perspective present in the articles. Then, identify if there are any significant alternative, under-reported, or dubious perspectives. Each perspective you create MUST correspond to one unique discourse type, and you must not create duplicate entries for the same discourse type. No need for a lot of perspectives, just what you think is useful.',
            'Remember: this is not a polished article. It is a raw, detailed information dump for a professional writer. Prioritize factual completeness and accuracy for each discourse category over narrative style. Each category must be unique.',
            'Analyze the following news articles selected from multiple sources.',
            'CRITIAL: Max 1 of each discourse type.',
            'Synopsis is a concise, information-dense summary capturing essential facts, key actors, and core narrative in ~50 words. In this template: "Tesla CEO Musk acquires Twitter ($44B, Oct 2022), fires executives, adds $8 verification fee, restores suspended accounts, triggers advertiser exodus (GM, Pfizer), 75% staff cuts, sparks free speech vs. safety debate."',

            'CRITIAL: A discourse type represents a unique perspective.',
            'News articles to analyze:',
            JSON.stringify(
                newsStory.articles.map((article) => ({
                    body: article.body,
                    headline: article.headline,
                })),
                null,
                2,
            ),
        );

    async run(params: { newsStory: NewsStory }): Promise<null | Story> {
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
                    countries: result.countries,
                    perspectiveTypes: result.perspectives.map((p) => p.tags.discourse_type),
                },
            );

            // Create the Story entity from AI response
            const storyId = randomUUID();
            const now = new Date();

            // Create value objects from AI response
            const category = new Category(result.category);
            const countries = result.countries.map((countryCode) => new Country(countryCode));

            // Create perspectives from AI response
            const perspectives = result.perspectives.map((perspectiveData) => {
                const holisticDigest = new HolisticDigest(perspectiveData.holisticDigest);
                const tags = new PerspectiveTags({
                    discourse_type: perspectiveData.tags.discourse_type,
                    stance: perspectiveData.tags.stance,
                });

                return new Perspective({
                    createdAt: now,
                    holisticDigest,
                    id: randomUUID(),
                    storyId,
                    tags,
                    updatedAt: now,
                });
            });

            // Create the story with perspectives
            const story = new Story({
                category,
                countries,
                createdAt: now,
                dateline: params.newsStory.publishedAt,
                id: storyId,
                perspectives,
                sourceReferences: params.newsStory.articles.map((article) => article.id),
                synopsis: result.synopsis,
                updatedAt: now,
            });

            this.logger.info(
                `[${StoryDigestAgentAdapter.NAME}] Successfully digested story: ${story.synopsis.substring(0, 100)}... with ${story.getPerspectiveCount()} perspectives`,
            );

            return story;
        } catch (error) {
            this.logger.error(`[${StoryDigestAgentAdapter.NAME}] Failed to digest story`, {
                articleCount: params.newsStory.articles.length,
                error,
            });
            return null;
        }
    }
}
