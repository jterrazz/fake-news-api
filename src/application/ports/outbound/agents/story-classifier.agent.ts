import { type AgentPort } from '@jterrazz/intelligence';
import { z } from 'zod/v4';

import { type Story } from '../../../../domain/entities/story.entity.js';

/**
 * The possible interest tiers that the agent can assign.
 * These are string literals that correspond to the `InterestTier` enum in the schema.
 */
export type InterestTier = 'ARCHIVED' | 'NICHE' | 'STANDARD';

/**
 * Defines the contract for the Story Classifier Agent.
 * This agent is responsible for analyzing a story and assigning it an interest tier.
 */
export type StoryClassifierAgentPort = AgentPort<
    StoryClassifierInput,
    null | StoryClassifierResult
>;

/**
 * The input for the Story Classifier Agent, which consists of the
 * full story entity that needs to be evaluated.
 */
export type StoryClassifierInput = {
    story: Story;
};

/**
 * Zod schema for the InterestTier string literals.
 * This is used for validating the AI's output.
 */
export const interestTierSchema = z.enum(['STANDARD', 'NICHE', 'ARCHIVED']);

/**
 * The output of the Story Classifier Agent, containing the assigned
 * interest tier and a brief justification for the decision.
 */
export type StoryClassifierResult = {
    interestTier: InterestTier;
    reason: string;
};
