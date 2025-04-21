import {
    type Article as PrismaArticle,
    type Category,
    type Country,
    type Language,
} from '@prisma/client';

import { Article } from '../../../../../domain/entities/article.js';
import { ArticleCategory } from '../../../../../domain/value-objects/article-category.vo.js';
import { ArticleContent } from '../../../../../domain/value-objects/article-content.vo.js';
import { ArticleCountry } from '../../../../../domain/value-objects/article-country.vo.js';
import { ArticleFakeStatus } from '../../../../../domain/value-objects/article-fake-status.vo.js';
import { ArticleHeadline } from '../../../../../domain/value-objects/article-headline.vo.js';
import { ArticleLanguage } from '../../../../../domain/value-objects/article-language.vo.js';
import { ArticleSummary } from '../../../../../domain/value-objects/article-summary.vo.js';

export class ArticleMapper {
    mapCategoryToDomain(category: Category): ArticleCategory {
        return ArticleCategory.create(category.toLowerCase());
    }

    mapCategoryToPrisma(category: ArticleCategory): Category {
        return category.toString().toUpperCase() as Category;
    }

    mapCountryToDomain(country: Country): ArticleCountry {
        return ArticleCountry.create(country.toLowerCase());
    }

    mapCountryToPrisma(country: ArticleCountry): Country {
        return country.toString().toLowerCase() as Country;
    }

    mapLanguageToDomain(language: Language): ArticleLanguage {
        return ArticleLanguage.create(language.toLowerCase());
    }

    mapLanguageToPrisma(language: ArticleLanguage): Language {
        return language.toString().toLowerCase() as Language;
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
