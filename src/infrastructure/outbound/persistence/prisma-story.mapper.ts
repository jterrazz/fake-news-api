import {
    type Category as PrismaCategory,
    type Country as PrismaCountry,
    type Discourse as PrismaDiscourse,
    type Perspective as PrismaPerspective,
    type Prisma,
    type Stance as PrismaStance,
    type Story as PrismaStory,
} from '@prisma/client';

import { Perspective } from '../../../domain/entities/perspective.entity.js';
import { Story } from '../../../domain/entities/story.entity.js';
import { Category } from '../../../domain/value-objects/category.vo.js';
import { Country } from '../../../domain/value-objects/country.vo.js';
import { HolisticDigest } from '../../../domain/value-objects/perspective/holistic-digest.vo.js';
import { PerspectiveTags } from '../../../domain/value-objects/perspective/perspective-tags.vo.js';

type PrismaStoryWithPerspectives = PrismaStory & {
    perspectives: PrismaPerspective[];
};

export class StoryMapper {
    mapCategoryToPrisma(category: Category): PrismaCategory {
        return category.toString() as PrismaCategory;
    }

    mapCountryFromPrisma(country: PrismaCountry): Country {
        return new Country(country);
    }

    mapCountryToPrisma(country: Country): PrismaCountry {
        return country.toString() as PrismaCountry;
    }

    mapDiscourseToPrisma(discourse?: string): null | PrismaDiscourse {
        return discourse ? (discourse as PrismaDiscourse) : null;
    }

    mapStanceToPrisma(stance?: string): null | PrismaStance {
        return stance ? (stance as PrismaStance) : null;
    }

    perspectiveToPrisma(
        perspective: Perspective,
    ): Omit<PrismaPerspective, 'createdAt' | 'updatedAt'> {
        return {
            discourse: this.mapDiscourseToPrisma(perspective.tags.tags.discourse_type),
            holisticDigest: perspective.holisticDigest.toString(),
            id: perspective.id,
            stance: this.mapStanceToPrisma(perspective.tags.tags.stance),
            storyId: perspective.storyId,
        };
    }

    toDomain(prismaStory: PrismaStoryWithPerspectives): Story {
        const perspectives = prismaStory.perspectives.map((prismaPerspective) => {
            const tags = new PerspectiveTags({
                discourse_type: prismaPerspective.discourse || undefined,
                stance: prismaPerspective.stance || undefined,
            });

            return new Perspective({
                createdAt: prismaPerspective.createdAt,
                holisticDigest: new HolisticDigest(prismaPerspective.holisticDigest),
                id: prismaPerspective.id,
                storyId: prismaPerspective.storyId,
                tags,
                updatedAt: prismaPerspective.updatedAt,
            });
        });

        return new Story({
            category: new Category(prismaStory.category.toLowerCase()),
            country: this.mapCountryFromPrisma(prismaStory.country),
            createdAt: prismaStory.createdAt,
            dateline: prismaStory.dateline,
            id: prismaStory.id,
            perspectives,
            sourceReferences: Array.isArray(prismaStory.sourceReferences)
                ? (prismaStory.sourceReferences as string[])
                : [],
            synopsis: prismaStory.synopsis,
            updatedAt: prismaStory.updatedAt,
        });
    }

    toPrisma(story: Story): Prisma.StoryCreateInput {
        return {
            category: this.mapCategoryToPrisma(story.category),
            country: this.mapCountryToPrisma(story.country),
            dateline: story.dateline,
            id: story.id,
            sourceReferences: story.sourceReferences,
            synopsis: story.synopsis,
        };
    }
}
