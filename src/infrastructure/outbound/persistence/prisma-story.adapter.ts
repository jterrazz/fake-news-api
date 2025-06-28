import { type StoryRepositoryPort } from '../../../application/ports/outbound/persistence/story-repository.port.js';

import { type Story } from '../../../domain/entities/story.entity.js';
import { type Country } from '../../../domain/value-objects/country.vo.js';

import { type PrismaAdapter } from './prisma.adapter.js';
import { StoryMapper } from './prisma-story.mapper.js';

export class PrismaStoryRepository implements StoryRepositoryPort {
    private readonly mapper: StoryMapper;

    constructor(private readonly prisma: PrismaAdapter) {
        this.mapper = new StoryMapper();
    }

    async create(story: Story): Promise<Story> {
        const prismaClient = this.prisma.getPrismaClient();

        // Use transaction to create story with perspectives
        const result = await prismaClient.$transaction(async (tx) => {
            // Create the story
            const createdStory = await tx.story.create({
                data: this.mapper.toPrisma(story),
            });

            // Create perspectives
            for (const perspective of story.perspectives) {
                await tx.perspective.create({
                    data: this.mapper.perspectiveToPrisma(perspective),
                });
            }

            // Return the created story with perspectives
            return await tx.story.findUnique({
                include: {
                    perspectives: true,
                },
                where: { id: createdStory.id },
            });
        });

        if (!result) {
            throw new Error('Failed to create story');
        }

        return this.mapper.toDomain(result);
    }

    async findById(id: string): Promise<null | Story> {
        const prismaStory = await this.prisma.getPrismaClient().story.findUnique({
            include: {
                perspectives: true,
            },
            where: { id },
        });

        return prismaStory ? this.mapper.toDomain(prismaStory) : null;
    }

    async findMany(criteria: {
        category?: string;
        country?: string;
        endDate?: Date;
        limit?: number;
        offset?: number;
        startDate?: Date;
    }): Promise<Story[]> {
        const where: Record<string, unknown> = {};

        // Category filter
        if (criteria.category) {
            where.category = criteria.category.toUpperCase();
        }

        // Country filter
        if (criteria.country) {
            where.country = criteria.country;
        }

        // Date range filter
        if (criteria.startDate || criteria.endDate) {
            where.dateline = {};
            if (criteria.startDate) {
                (where.dateline as Record<string, unknown>).gte = criteria.startDate;
            }
            if (criteria.endDate) {
                (where.dateline as Record<string, unknown>).lte = criteria.endDate;
            }
        }

        const stories = await this.prisma.getPrismaClient().story.findMany({
            include: {
                perspectives: true,
            },
            orderBy: {
                dateline: 'desc',
            },
            skip: criteria.offset,
            take: criteria.limit,
            where,
        });

        return stories.map((story) => this.mapper.toDomain(story));
    }

    async getAllSourceReferences(country: Country): Promise<string[]> {
        const stories = await this.prisma.getPrismaClient().story.findMany({
            orderBy: {
                createdAt: 'desc',
            },
            select: {
                sourceReferences: true,
            },
            take: 2000,
            where: {
                country: this.mapper.mapCountryToPrisma(country),
            },
        });

        // Extract all source references from all stories
        const sourceReferences = stories.flatMap((story) => story.sourceReferences as string[]);

        return sourceReferences;
    }
}
