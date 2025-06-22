import { type LoggerPort } from '@jterrazz/logger';

import { type Story } from '../../../domain/entities/story.entity.js';
import { type Country } from '../../../domain/value-objects/country.vo.js';
import { type Language } from '../../../domain/value-objects/language.vo.js';

import { type StoryDigestAgent } from '../../ports/outbound/agents/story-digest.agent.js';
import { type StoryRepositoryPort } from '../../ports/outbound/persistence/story-repository.port.js';
import { type NewsProviderPort } from '../../ports/outbound/providers/news.port.js';

/**
 * Use case for digesting stories from news sources
 */
export class DigestStoriesUseCase {
    constructor(
        private readonly storyDigestAgent: StoryDigestAgent,
        private readonly logger: LoggerPort,
        private readonly newsProvider: NewsProviderPort,
        private readonly storyRepository: StoryRepositoryPort,
    ) {}

    /**
     * Digest stories for a specific language and country
     */
    public async execute(language: Language, country: Country): Promise<Story[]> {
        try {
            this.logger.info('Starting story digestion', {
                country: country.toString(),
                language: language.toString(),
            });

            // Fetch news from external providers
            const newsStories = await this.newsProvider.fetchNews({
                country,
                language,
            });

            if (newsStories.length === 0) {
                this.logger.warn('No news stories found', {
                    country: country.toString(),
                    language: language.toString(),
                });
                return [];
            }

            this.logger.info('Retrieved news stories from providers', {
                count: newsStories.length,
                country: country.toString(),
                language: language.toString(),
            });

            // Filter and validate news stories
            const validNewsStories = newsStories.filter((story) => story.articles.length >= 2);

            if (validNewsStories.length === 0) {
                this.logger.warn('No valid news stories after filtering', {
                    country: country.toString(),
                    language: language.toString(),
                    originalCount: newsStories.length,
                });
                return [];
            }

            // Process each news story individually through the AI agent
            const digestedStories: Story[] = [];

            for (const newsStory of validNewsStories) {
                try {
                    // Send individual news story to AI agent to digest into structured story
                    const digestedStory = await this.storyDigestAgent.run({
                        newsStory,
                    });

                    if (!digestedStory) {
                        this.logger.warn('AI agent returned null story', {
                            country: country.toString(),
                            language: language.toString(),
                            newsStoryArticleCount: newsStory.articles.length,
                        });
                        continue;
                    }

                    // Store the digested story in the database
                    const savedStory = await this.storyRepository.create(digestedStory);

                    this.logger.info('Successfully digested and stored story', {
                        country: country.toString(),
                        language: language.toString(),
                        storyCategory: savedStory.category.toString(),
                        storyId: savedStory.id,
                        storyTitle: savedStory.title,
                    });

                    digestedStories.push(savedStory);
                } catch (storyError) {
                    this.logger.warn('Failed to digest individual story', {
                        country: country.toString(),
                        error: storyError,
                        language: language.toString(),
                        newsStoryArticleCount: newsStory.articles.length,
                    });
                    // Continue processing other stories even if one fails
                }
            }

            return digestedStories;
        } catch (error) {
            this.logger.error('Failed to digest stories', {
                country: country.toString(),
                error,
                language: language.toString(),
            });
            throw error;
        }
    }
}
