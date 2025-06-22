import {
    BasicAgentAdapter,
    type ModelPort,
    SystemPromptAdapter,
    UserPromptAdapter,
} from '@jterrazz/intelligence';
import { type LoggerPort } from '@jterrazz/logger';
import { randomUUID } from 'crypto';
import { z } from 'zod/v4';

import { type StoryDigestAgentPort } from '../../../application/ports/outbound/agents/story-digest.agent.js';
import { type NewsStory } from '../../../application/ports/outbound/providers/news.port.js';

import { Perspective } from '../../../domain/entities/perspective.entity.js';
import { Story } from '../../../domain/entities/story.entity.js';
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
        category: categorySchema.describe('Category that best fits this story'),
        countries: z.array(countrySchema).describe('Array of relevant countries for this story'),
        perspectives: z
            .array(
                z.object({
                    holisticDigest: holisticDigestSchema.describe(
                        'Comprehensive summary of this perspective',
                    ),
                    tags: z.object({
                        discourse_type: discourseTypeSchema.describe(
                            'Type of discourse or media coverage',
                        ),
                        stance: stanceSchema.describe('Stance toward the specific story'),
                    }),
                }),
            )
            .describe('Array of different perspectives on this story'),
        title: z.string().max(100).describe('Brief, clear title'),
    });

    static readonly SYSTEM_PROMPT = new SystemPromptAdapter(
        [
            'You are a professional journalist tasked with analyzing multiple news articles about the same story.',
            'Your goal is to create a coherent story digest that combines perspectives from all provided articles.',
            'Be objective and factual in your analysis.',
        ].join('\n'),
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
            'Analyze the following news articles and create a story digest.',
            'Focus on extracting the key story, identifying different perspectives, and categorizing the stance and discourse type.',
            '',
            'News articles to analyze:',
            JSON.stringify(newsStory.articles, null, 2),
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
                dateline: params.newsStory.articles[0].publishedAt,
                id: storyId,
                perspectives,
                sourceReferences: params.newsStory.articles.map((article) => article.id),
                title: result.title,
                updatedAt: now,
            });

            this.logger.info(
                `[${StoryDigestAgentAdapter.NAME}] Successfully digested story: ${story.title} with ${story.getPerspectiveCount()} perspectives`,
            );

            return story;
        } catch (error) {
            this.logger.error(`[${StoryDigestAgentAdapter.NAME}] Failed to digest story`, {
                error,
            });
            return null;
        }
    }
}
