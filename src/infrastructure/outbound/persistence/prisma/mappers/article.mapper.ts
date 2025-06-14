import {
    type Article as PrismaArticle,
    type Category as PrismaCategory,
    type Country as PrismaCountry,
    type Language as PrismaLanguage,
} from '@prisma/client';

import { Article } from '../../../../../domain/entities/article.entity.js';
import { ArticleContent } from '../../../../../domain/value-objects/article/content.vo.js';
import { ArticleFakeStatus } from '../../../../../domain/value-objects/article/fake-status.vo.js';
import { ArticleHeadline } from '../../../../../domain/value-objects/article/headline.vo.js';
import { ArticleSummary } from '../../../../../domain/value-objects/article/summary.vo.js';
import { Category } from '../../../../../domain/value-objects/category.vo.js';
import { Country } from '../../../../../domain/value-objects/country.vo.js';
import { Language } from '../../../../../domain/value-objects/language.vo.js';

export class ArticleMapper {
    mapCategoryToDomain(category: PrismaCategory): Category {
        return Category.create(category.toLowerCase());
    }

    mapCategoryToPrisma(category: Category): PrismaCategory {
        return category.toString().toUpperCase() as PrismaCategory;
    }

    mapCountryToDomain(country: PrismaCountry): Country {
        return Country.create(country.toLowerCase());
    }

    mapCountryToPrisma(country: Country): PrismaCountry {
        return country.toString().toLowerCase() as PrismaCountry;
    }

    mapLanguageToDomain(language: PrismaLanguage): Language {
        return Language.create(language.toLowerCase());
    }

    mapLanguageToPrisma(language: Language): PrismaLanguage {
        return language.toString().toLowerCase() as PrismaLanguage;
    }

    toDomain(prisma: PrismaArticle): Article {
        return Article.create({
            category: this.mapCategoryToDomain(prisma.category),
            content: ArticleContent.create(prisma.article),
            country: this.mapCountryToDomain(prisma.country),
            createdAt: prisma.createdAt,
            fakeStatus: prisma.isFake
                ? ArticleFakeStatus.createFake(prisma.fakeReason ?? '')
                : ArticleFakeStatus.createNonFake(),
            headline: ArticleHeadline.create(prisma.headline),
            id: prisma.id,
            language: this.mapLanguageToDomain(prisma.language),
            publishedAt: prisma.createdAt,
            summary: ArticleSummary.create(prisma.summary),
        });
    }

    toPrisma(domain: Article): Omit<PrismaArticle, 'createdAt' | 'id'> {
        return {
            article: domain.content.toString(),
            category: this.mapCategoryToPrisma(domain.category),
            country: this.mapCountryToPrisma(domain.country),
            fakeReason: domain.fakeStatus.reason,
            headline: domain.headline.toString(),
            isFake: domain.isFake(),
            language: this.mapLanguageToPrisma(domain.language),
            summary: domain.summary.toString(),
        };
    }
}
