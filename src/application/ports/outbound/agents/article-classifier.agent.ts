import { type AgentPort } from '@jterrazz/intelligence';
import { z } from 'zod/v4';

import { type Article } from '../../../../domain/entities/article.entity.js';

/**
 * Defines the contract for the Article Classifier Agent.
 * This agent is responsible for analyzing an article and assigning it a publication tier.
 */
export type ArticleClassifierAgentPort = AgentPort<
    ArticleClassifierInput,
    ArticleClassifierResult | null
>;

/**
 * The input for the Article Classifier Agent, which consists of the
 * full article entity that needs to be evaluated.
 */
export type ArticleClassifierInput = {
    article: Article;
};

/**
 * The possible publication tiers that the agent can assign.
 * These are string literals that correspond to the `PublicationTier` enum in the schema.
 */
export type PublicationTier = 'ARCHIVED' | 'NICHE' | 'STANDARD';

/**
 * Zod schema for the PublicationTier string literals.
 * This is used for validating the AI's output.
 */
export const publicationTierSchema = z.enum(['STANDARD', 'NICHE', 'ARCHIVED']);

/**
 * The output of the Article Classifier Agent, containing the assigned
 * publication tier and a brief justification for the decision.
 */
export type ArticleClassifierResult = {
    publicationTier: PublicationTier;
    reason: string;
};
