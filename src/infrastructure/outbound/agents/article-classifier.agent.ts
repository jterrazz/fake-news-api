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
    type ArticleClassifierAgentPort,
    type ArticleClassifierInput,
    type ArticleClassifierResult,
    type PublicationTier,
    publicationTierSchema,
} from '../../../application/ports/outbound/agents/article-classifier.agent.js';

export class ArticleClassifierAgentAdapter implements ArticleClassifierAgentPort {
    static readonly NAME = 'ArticleClassifierAgent';

    static readonly SCHEMA = z.object({
        publicationTier: publicationTierSchema,
        reason: z.string().describe('A brief, clear justification for your tier selection.'),
    });

    static readonly SYSTEM_PROMPT = new SystemPromptAdapter(
        'You are an expert Senior Editor for a modern digital news platform. Your primary responsibility is to classify content to ensure quality, relevance, and proper placement within the app.',
        'You are discerning, have high standards, and understand what makes an article compelling for a broad audience versus a niche one.',
        PROMPT_LIBRARY.FOUNDATIONS.CONTEXTUAL_ONLY,
        PROMPT_LIBRARY.TONES.NEUTRAL,
    );

    private readonly agent: BasicAgentAdapter<z.infer<typeof ArticleClassifierAgentAdapter.SCHEMA>>;

    constructor(
        private readonly model: ModelPort,
        private readonly logger: LoggerPort,
    ) {
        this.agent = new BasicAgentAdapter(ArticleClassifierAgentAdapter.NAME, {
            logger: this.logger,
            model: this.model,
            schema: ArticleClassifierAgentAdapter.SCHEMA,
            systemPrompt: ArticleClassifierAgentAdapter.SYSTEM_PROMPT,
        });
    }

    static readonly USER_PROMPT = (input: ArticleClassifierInput) => {
        const { article } = input;
        const articleData = {
            body: article.body.value,
            category: article.category.toString(),
            headline: article.headline.value,
            variants: article.variants?.map((v) => ({
                headline: v.headline.value,
                stance: v.stance,
            })),
        };

        return new UserPromptAdapter(
            // Core Mission
            'You are a Senior Editor responsible for deciding if an article has broad, general appeal or is better suited for a niche audience. Your goal is to ensure our main feed is engaging for everyone, while still serving fans of specific topics.',
            '',

            // The Tiers - Your Choices
            'You have two primary choices:',
            '•   **STANDARD:** For articles with broad, mainstream appeal. These are the big stories that a general audience would find interesting or important (e.g., a major championship match, a significant political event). Roughly 70% of articles should be in this tier.',
            '•   **NICHE:** For articles that are well-written but cover a topic of interest to a smaller, specific group (e.g., a regular-season match for a less popular team, a specific scientific discovery). Roughly 30% or less of articles should be in this tier.',
            '•   **ARCHIVED:** Use this ONLY for content that is not a real news article (e.g., an advertisement, a test article, corrupted text).',
            '',

            // How to Make Your Decision
            "The ONLY factor to consider is the topic's audience appeal. Ask yourself: 'Is this a story for everyone, or a story for a specific group of fans/experts?'",
            '',

            // Critical Rules
            'CRITICAL RULES:',
            '•   You **MUST** select one of the three tiers.',
            '•   Base your decision **only** on the topic of the article, not its writing style or quality.',
            '•   You **MUST** provide a brief, clear `reason` for your choice.',
            '',

            // Article to Analyze
            'ARTICLE TO ANALYZE:',
            JSON.stringify(articleData, null, 2),
        );
    };

    async run(input: ArticleClassifierInput): Promise<ArticleClassifierResult | null> {
        try {
            this.logger.info(`[${ArticleClassifierAgentAdapter.NAME}] Classifying article...`, {
                articleId: input.article.id,
            });

            const result = await this.agent.run(ArticleClassifierAgentAdapter.USER_PROMPT(input));

            if (!result) {
                this.logger.warn(
                    `[${ArticleClassifierAgentAdapter.NAME}] Classification failed. No result from AI model.`,
                    {
                        articleId: input.article.id,
                    },
                );
                return null;
            }

            this.logger.info(
                `[${ArticleClassifierAgentAdapter.NAME}] Article classified successfully.`,
                {
                    articleId: input.article.id,
                    publicationTier: result.publicationTier,
                    reason: result.reason,
                },
            );

            return {
                publicationTier: result.publicationTier as PublicationTier,
                reason: result.reason,
            };
        } catch (error) {
            this.logger.error(
                `[${ArticleClassifierAgentAdapter.NAME}] An error occurred during classification.`,
                {
                    articleId: input.article.id,
                    error,
                },
            );
            return null;
        }
    }
}
