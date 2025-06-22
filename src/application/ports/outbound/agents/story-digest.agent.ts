import { type AgentPort } from '@jterrazz/intelligence';

import { type Story } from '../../../../domain/entities/story.entity.js';

import { type NewsStory } from '../providers/news.port.js';

export type StoryDigestAgentPort = AgentPort<
    {
        newsStory: NewsStory;
    },
    Story
>;
