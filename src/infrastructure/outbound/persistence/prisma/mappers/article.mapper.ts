import type { Article as PrismaArticle } from '@prisma/client';

import { Article } from '../../../../../domain/entities/article.js';
import { ArticleCategory } from '../../../../../domain/value-objects/article-category.vo.js';
import { ArticleCountry } from '../../../../../domain/value-objects/article-country.vo.js';
import { ArticleLanguage } from '../../../../../domain/value-objects/article-language.vo.js';

export class ArticleMapper {
    toDomain(prisma: PrismaArticle): Article {
        return Article.create({
            article: prisma.article,
            category: this.mapCategoryToDomain(prisma.category),
            country: this.mapCountryToDomain(prisma.country),
            fakeReason: prisma.fakeReason,
            headline: prisma.headline,
            isFake: prisma.isFake,
            language: this.mapLanguageToDomain(prisma.language),
            summary: prisma.summary,
        });
    }

    toPrisma(domain: Article): Omit<PrismaArticle, 'id' | 'createdAt'> {
        return {
            article: domain.article,
            category: this.mapCategoryToPrisma(domain.category),
            country: this.mapCountryToPrisma(domain.country),
            fakeReason: domain.fakeReason,
            headline: domain.headline,
            isFake: domain.isFake,
            language: this.mapLanguageToPrisma(domain.language),
            summary: domain.summary,
        };
    }

    mapCategoryToDomain(category: string): ArticleCategory {
        return ArticleCategory[category as keyof typeof ArticleCategory];
    }

    mapCountryToDomain(country: string): ArticleCountry {
        return ArticleCountry[country as keyof typeof ArticleCountry];
    }

    mapLanguageToDomain(language: string): ArticleLanguage {
        return ArticleLanguage[language as keyof typeof ArticleLanguage];
    }

    mapCategoryToPrisma(category: ArticleCategory): string {
        return category.toString();
    }

    mapCountryToPrisma(country: ArticleCountry): string {
        return country.toString();
    }

    mapLanguageToPrisma(language: ArticleLanguage): string {
        return language.toString();
    }
} 