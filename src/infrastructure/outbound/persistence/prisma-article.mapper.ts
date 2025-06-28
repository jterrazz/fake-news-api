import {
    type Article as PrismaArticle,
    type Category as PrismaCategory,
    type Country as PrismaCountry,
    type Language as PrismaLanguage,
    type Prisma,
} from '@prisma/client';

import { Article } from '../../../domain/entities/article.entity.js';
import { Authenticity } from '../../../domain/value-objects/article/authenticity.vo.js';
import { Body } from '../../../domain/value-objects/article/body.vo.js';
import { Headline } from '../../../domain/value-objects/article/headline.vo.js';
import { Category } from '../../../domain/value-objects/category.vo.js';
import { Country } from '../../../domain/value-objects/country.vo.js';
import { Language } from '../../../domain/value-objects/language.vo.js';

export class ArticleMapper {
    mapCategoryToPrisma(category: Category): PrismaCategory {
        return category.toString() as PrismaCategory;
    }

    mapCountryToPrisma(country: Country): PrismaCountry {
        return country.toString();
    }

    mapLanguageToPrisma(language: Language): PrismaLanguage {
        return language.toString();
    }

    toDomain(prisma: PrismaArticle & { stories?: { id: string }[] }): Article {
        return new Article({
            authenticity: new Authenticity(prisma.fakeStatus, prisma.fakeReason),
            body: new Body(prisma.body),
            category: new Category(prisma.category),
            country: new Country(prisma.country),
            headline: new Headline(prisma.headline),
            id: prisma.id,
            language: new Language(prisma.language),
            publishedAt: prisma.publishedAt,
            storyIds: prisma.stories?.map((story) => story.id),
        });
    }

    toPrisma(domain: Article): Prisma.ArticleCreateInput {
        return {
            body: domain.body.value,
            category: this.mapCategoryToPrisma(domain.category),
            country: this.mapCountryToPrisma(domain.country),
            fakeReason: domain.authenticity.reason,
            fakeStatus: domain.isFake(),
            headline: domain.headline.value,
            id: domain.id,
            language: this.mapLanguageToPrisma(domain.language),
            publishedAt: domain.publishedAt,
            stories: domain.storyIds
                ? {
                      connect: domain.storyIds.map((id) => ({ id })),
                  }
                : undefined,
        };
    }
}
