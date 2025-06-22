import { type Story } from '../../../../domain/entities/story.entity.js';

/**
 * Repository port for story persistence operations
 */
export interface StoryRepositoryPort {
    /**
     * Create a new story
     */
    create(story: Story): Promise<Story>;

    /**
     * Find a story by ID
     */
    findById(id: string): Promise<null | Story>;

    /**
     * Find stories by criteria
     */
    findMany(criteria: {
        category?: string;
        country?: string;
        endDate?: Date;
        limit?: number;
        offset?: number;
        startDate?: Date;
    }): Promise<Story[]>;
}
