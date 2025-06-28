import { type AgentPort } from '@jterrazz/intelligence';

import { type Story } from '../../../../domain/entities/story.entity.js';
import { type Category } from '../../../../domain/value-objects/category.vo.js';
import { type Country } from '../../../../domain/value-objects/country.vo.js';
import { type Language } from '../../../../domain/value-objects/language.vo.js';

export type ArticleComposerAgentPort = AgentPort<
    ArticleCompositionInput,
    ArticleCompositionResult | null
>;

/**
 * Input parameters for article composition
 */
export type ArticleCompositionInput = {
    story: Story;
    targetCountry: Country;
    targetLanguage: Language;
};

/**
 * Result from AI agent for article composition
 */
export type ArticleCompositionResult = {
    body: string;
    category: Category;
    fakeReason?: string;
    fakeStatus: boolean;
    headline: string;
};
