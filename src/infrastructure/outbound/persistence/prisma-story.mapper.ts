import {
    type Category as PrismaCategory,
    type Country as PrismaCountry,
    type DiscourseType as PrismaDiscourseType,
    type Perspective as PrismaPerspective,
    type PerspectiveTag as PrismaPerspectiveTag,
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
    perspectives: (PrismaPerspective & {
        tags: null | PrismaPerspectiveTag;
    })[];
};

export class StoryMapper {
    mapCategoryToPrisma(category: Category): PrismaCategory {
        return category.toString().toUpperCase() as PrismaCategory;
    }

    mapCountryFromPrisma(country: PrismaCountry): Country {
        return new Country(country);
    }

    mapCountryToPrisma(country: Country): PrismaCountry {
        return country.toString() as PrismaCountry;
    }

    mapDiscourseTypeToPrisma(discourseType?: string): null | PrismaDiscourseType {
        return discourseType ? (discourseType as PrismaDiscourseType) : null;
    }

    mapStanceToPrisma(stance?: string): null | PrismaStance {
        return stance ? (stance as PrismaStance) : null;
    }

    perspectiveTagToPrisma(perspective: Perspective): Omit<PrismaPerspectiveTag, 'id'> {
        return {
            discourseType: this.mapDiscourseTypeToPrisma(perspective.tags.tags.discourse_type),
            perspectiveId: perspective.id,
            stance: this.mapStanceToPrisma(perspective.tags.tags.stance),
        };
    }

    perspectiveToPrisma(
        perspective: Perspective,
    ): Omit<PrismaPerspective, 'createdAt' | 'updatedAt'> {
        return {
            holisticDigest: perspective.holisticDigest.toString(),
            id: perspective.id,
            storyId: perspective.storyId,
        };
    }

    toDomain(prismaStory: PrismaStoryWithPerspectives): Story {
        const perspectives = prismaStory.perspectives.map((prismaPerspective) => {
            const tags = new PerspectiveTags({
                discourse_type: prismaPerspective.tags?.discourseType || undefined,
                stance: prismaPerspective.tags?.stance || undefined,
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
