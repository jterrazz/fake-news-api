import { type LoggerPort } from '@jterrazz/logger';
import { randomUUID } from 'crypto';

import { Perspective } from '../../../domain/entities/perspective.entity.js';
import { type Story } from '../../../domain/entities/story.entity.js';
import { Story as StoryEntity } from '../../../domain/entities/story.entity.js';
import { type Country } from '../../../domain/value-objects/country.vo.js';
import { type Language } from '../../../domain/value-objects/language.vo.js';

import { type StoryDigestAgentPort } from '../../ports/outbound/agents/story-digest.agent.js';
import { type StoryRepositoryPort } from '../../ports/outbound/persistence/story-repository.port.js';
import { type NewsProviderPort } from '../../ports/outbound/providers/news.port.js';

/**
 * Use case for digesting stories from news sources
 */
export class DigestStoriesUseCase {
    constructor(
        private readonly storyDigestAgent: StoryDigestAgentPort,
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

            // Get existing source references for deduplication
            const existingSourceReferences =
                await this.storyRepository.getAllSourceReferences(country);
            this.logger.info('Retrieved existing source references for deduplication', {
                count: existingSourceReferences.length,
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

            // Filter out stories with articles that have already been processed
            const newNewsStories = newsStories.filter((story) => {
                const hasProcessedArticle = story.articles.some((article) =>
                    existingSourceReferences.includes(article.id),
                );
                return !hasProcessedArticle;
            });

            this.logger.info('Filtered out already processed stories', {
                country: country.toString(),
                filteredOut: newsStories.length - newNewsStories.length,
                language: language.toString(),
                newCount: newNewsStories.length,
                originalCount: newsStories.length,
            });

            if (newNewsStories.length === 0) {
                this.logger.info('No new stories to process after deduplication', {
                    country: country.toString(),
                    language: language.toString(),
                });
                return [];
            }

            // Filter and validate news stories
            let validNewsStories = newNewsStories.filter((story) => story.articles.length >= 4);

            if (validNewsStories.length === 0) {
                this.logger.warn('No valid news stories after filtering', {
                    country: country.toString(),
                    language: language.toString(),
                    originalCount: newNewsStories.length,
                });
                return [];
            }

            // Process each news story individually through the AI agent
            const digestedStories: Story[] = [];

            console.log('validNewsStories');
            console.log('validNewsStories');
            console.log('validNewsStories');
            console.log('validNewsStories');
            console.log('validNewsStories');
            console.log('validNewsStories');
            console.log('validNewsStories', validNewsStories.length);

            validNewsStories = validNewsStories.slice(0, 1);

            for (const newsStory of validNewsStories) {
                try {
                    // Send individual news story to AI agent to digest into structured story
                    const digestResult = await this.storyDigestAgent.run({
                        newsStory,
                    });

                    if (!digestResult) {
                        this.logger.warn('AI agent returned null story', {
                            country: country.toString(),
                            language: language.toString(),
                            newsStoryArticleCount: newsStory.articles.length,
                        });
                        continue;
                    }

                    // Generate story metadata that we handle in the use case
                    const storyId = randomUUID();
                    const now = new Date();

                    // Create perspectives from the raw perspective data
                    const perspectives = digestResult.perspectives.map((perspectiveData) => {
                        return new Perspective({
                            createdAt: now,
                            holisticDigest: perspectiveData.holisticDigest,
                            id: randomUUID(),
                            storyId,
                            tags: perspectiveData.tags,
                            updatedAt: now,
                        });
                    });

                    // Create the complete story with use case-managed fields
                    const story = new StoryEntity({
                        category: digestResult.category,
                        country: country, // Use the country from the use case context
                        createdAt: now,
                        dateline: newsStory.publishedAt, // Use the news story's published date
                        id: storyId,
                        perspectives: perspectives,
                        sourceReferences: newsStory.articles.map((article) => article.id),
                        synopsis: digestResult.synopsis,
                        updatedAt: now,
                    });

                    // Store the digested story in the database
                    const savedStory = await this.storyRepository.create(story);

                    this.logger.info(`Saving story for ${country}/${language}`, {
                        storySynopsis: savedStory.synopsis,
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
