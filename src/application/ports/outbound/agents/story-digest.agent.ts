import { type AgentPort } from '@jterrazz/intelligence';

import { type Category } from '../../../../domain/value-objects/category.vo.js';
import { type HolisticDigest } from '../../../../domain/value-objects/perspective/holistic-digest.vo.js';
import { type PerspectiveTags } from '../../../../domain/value-objects/perspective/perspective-tags.vo.js';

import { type NewsStory } from '../providers/news.port.js';

/**
 * Raw perspective data returned by the AI agent
 * Excludes fields that should be handled by the use case (id, storyId, dates)
 */
export interface PerspectiveDigestData {
    holisticDigest: HolisticDigest;
    tags: PerspectiveTags;
}

export type StoryDigestAgentPort = AgentPort<
    {
        newsStory: NewsStory;
    },
    null | StoryDigestResult
>;

/**
 * Partial story digest returned by the AI agent
 * Excludes fields that should be handled by the use case (countries, id, dates)
 */
export interface StoryDigestResult {
    category: Category;
    perspectives: PerspectiveDigestData[];
    synopsis: string;
}
