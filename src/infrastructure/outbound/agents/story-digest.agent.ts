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
            // Main objective
            'If my prompt is not clear, feel free to try your best based on the context.',
            'Your goal is to create a structured brief for a writer by analyzing news articles. You must identify the underlying sides and narratives of the story and categorize the different perspectives into distinct discourse types.',
            'You NEVER judge the quality of the perspectives, you only categorize them, in order to help the writer understand equally the different sides of the story.',

            // Core task description
            'Analyze the news articles and identify distinct perspectives based on discourse types:',
            '• MAINSTREAM: The primary, widely accepted narrative presented by major, most consensual media outlets.',
            '• ALTERNATIVE: A counter-narrative that is still seen in the public medias.',
            '• UNDERREPORTED and DUBIOUS: DO NOT USE those for now.',
            // '• UNDERREPORTED: A perspective largely absent from mainstream coverage, which the provided articles might reference as coming from external sources (e.g., specialized reports, foreign analysis).',
            // '• DUBIOUS: A perspective based on questionable or unsubstantiated claims, like flat earth theories.',

            // Critical Rules
            'CRITICAL RULES:',
            '• Your analysis MUST be based strictly on the provided context. Do not introduce your own information.',
            "• The 'underreported' category can ONLY be used if the articles explicitly cite a viewpoint from a non-media source. If all views originate from the newspapers themselves, do NOT use this category.",
            '• Each perspective MUST correspond to ONE unique discourse type. NO DUPLICATES perspectives.',
            '• MAX 2 perspectives total. Only create perspectives that are clearly present in the articles.',

            // Synopsis Requirements
            'SYNOPSIS REQUIREMENTS:',
            '• Create a concise, information-dense summary capturing essential facts, key actors, and the core narrative in ~50 words.',
            '• Prioritize factual completeness over narrative style.',

            // Data input
            'Newspapers articles to analyze:',
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

            console.log('ISSSOSUOUUUUUUUUUUUUUUUUUUUUUUUUU');
            console.log('ISSSOSUOUUUUUUUUUUUUUUUUUUUUUUUUU');
            console.log('ISSSOSUOUUUUUUUUUUUUUUUUUUUUUUUUU');
            console.log('ISSSOSUOUUUUUUUUUUUUUUUUUUUUUUUUU');
            console.log('ISSSOSUOUUUUUUUUUUUUUUUUUUUUUUUUU');
            console.log('ISSSOSUOUUUUUUUUUUUUUUUUUUUUUUUUU');
            console.log('ISSSOSUOUUUUUUUUUUUUUUUUUUUUUUUUU');
            console.log('ISSSOSUOUUUUUUUUUUUUUUUUUUUUUUUUU');
            console.log(StoryDigestAgentAdapter.USER_PROMPT(params.newsStory).generate());

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
