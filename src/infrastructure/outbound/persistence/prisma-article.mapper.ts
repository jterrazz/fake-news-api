import {
    type Article as PrismaArticle,
    type Category as PrismaCategory,
    type Country as PrismaCountry,
    type Language as PrismaLanguage,
} from '@prisma/client';

import { Article } from '../../../domain/entities/article.entity.js';
import { Authenticity } from '../../../domain/value-objects/article/authenticity.vo.js';
import { Body } from '../../../domain/value-objects/article/body.vo.js';
import { Headline } from '../../../domain/value-objects/article/headline.vo.js';
import { Summary } from '../../../domain/value-objects/article/summary.vo.js';
import { Category } from '../../../domain/value-objects/category.vo.js';
import { Country } from '../../../domain/value-objects/country.vo.js';
import { Language } from '../../../domain/value-objects/language.vo.js';

export class ArticleMapper {
    mapCategoryToPrisma(category: Category): PrismaCategory {
        return category.toString().toUpperCase() as PrismaCategory;
    }

    mapCountryToPrisma(country: Country): PrismaCountry {
        return country.toString();
    }

    mapLanguageToPrisma(language: Language): PrismaLanguage {
        return language.toString();
    }

    toDomain(prisma: PrismaArticle): Article {
        return new Article({
            authenticity: new Authenticity(prisma.isFake, prisma.fakeReason),
            body: new Body(prisma.article),
            category: new Category(prisma.category),
            country: new Country(prisma.country),
            headline: new Headline(prisma.headline),
            id: prisma.id,
            language: new Language(prisma.language),
            publishedAt: prisma.createdAt,
            summary: new Summary(prisma.summary),
        });
    }

    toPrisma(domain: Article): PrismaArticle {
        return {
            article: domain.body.value,
            category: this.mapCategoryToPrisma(domain.category),
            country: this.mapCountryToPrisma(domain.country),
            createdAt: domain.publishedAt,
            fakeReason: domain.authenticity.reason,
            headline: domain.headline.value,
            id: domain.id,
            isFake: domain.isFake(),
            language: this.mapLanguageToPrisma(domain.language),
            summary: domain.summary.value,
        };
    }
}
