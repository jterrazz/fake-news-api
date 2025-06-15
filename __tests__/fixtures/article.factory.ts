import {
    type Category as PrismaCategory,
    type Country as PrismaCountry,
    type Language as PrismaLanguage,
    type PrismaClient,
} from '@prisma/client';
import { addDays, subDays } from 'date-fns';

import { Article } from '../../src/domain/entities/article.entity.js';
import { Authenticity } from '../../src/domain/value-objects/article/authenticity.vo.js';
import { Body } from '../../src/domain/value-objects/article/body.vo.js';
import { Headline } from '../../src/domain/value-objects/article/headline.vo.js';
import { Summary } from '../../src/domain/value-objects/article/summary.vo.js';
import { Category } from '../../src/domain/value-objects/category.vo.js';
import { Country } from '../../src/domain/value-objects/country.vo.js';
import { Language } from '../../src/domain/value-objects/language.vo.js';

/**
 * Article test data builder using the Factory pattern
 * Provides fluent API for creating test articles with domain entities
 */
export class ArticleFactory {
    private data: {
        authenticity: Authenticity;
        body: Body;
        category: Category;
        country: Country;
        createdAt: Date;
        headline: Headline;
        id: string;
        language: Language;
        publishedAt: Date;
        summary: Summary;
    };

    constructor() {
        this.data = {
            authenticity: new Authenticity(false),
            body: new Body('Default test article body with detailed information about the topic.'),
            category: new Category('technology'),
            country: new Country('us'),
            createdAt: new Date('2024-03-01T12:00:00.000Z'),
            headline: new Headline('Default Test Article'),
            id: crypto.randomUUID(),
            language: new Language('en'),
            publishedAt: new Date('2024-03-01T12:00:00.000Z'),
            summary: new Summary('Default test article summary providing key information.'),
        };
    }

    asFake(reason: string = 'AI-generated test content'): ArticleFactory {
        this.data.authenticity = new Authenticity(true, reason);
        return this;
    }

    asReal(): ArticleFactory {
        this.data.authenticity = new Authenticity(false);
        return this;
    }

    build(): Article {
        return new Article({ ...this.data });
    }

    buildMany(count: number): Article[] {
        return Array.from({ length: count }, (_, index) => {
            const factory = new ArticleFactory();
            factory.data = { ...this.data };
            factory.data.id = crypto.randomUUID();
            factory.data.headline = new Headline(`${this.data.headline.value} ${index + 1}`);
            factory.data.createdAt = new Date(this.data.createdAt.getTime() - index * 1000 * 60);
            return factory.build();
        });
    }

    createdDaysAgo(days: number): ArticleFactory {
        this.data.createdAt = subDays(new Date(), days);
        return this;
    }

    createdDaysFromNow(days: number): ArticleFactory {
        this.data.createdAt = addDays(new Date(), days);
        return this;
    }

    async createInDatabase(prisma: PrismaClient): Promise<Article> {
        const article = this.build();
        await prisma.article.create({
            data: {
                article: article.body.value,
                category: article.category.toString().toUpperCase() as PrismaCategory,
                country: article.country.toString() as PrismaCountry,
                createdAt: article.createdAt,
                fakeReason: article.authenticity.reason,
                headline: article.headline.value,
                id: article.id,
                isFake: article.isFake(),
                language: article.language.toString() as PrismaLanguage,
                summary: article.summary.value,
            },
        });
        return article;
    }

    async createManyInDatabase(prisma: PrismaClient, count: number): Promise<Article[]> {
        const articles = this.buildMany(count);
        await Promise.all(
            articles.map((article) =>
                new ArticleFactory()
                    .withCategory(article.category.toString())
                    .withCountry(article.country.toString())
                    .withLanguage(article.language.toString())
                    .withHeadline(article.headline.value)
                    .withBody(article.body.value)
                    .withSummary(article.summary.value)
                    .withCreatedAt(article.createdAt)
                    .withPublishedAt(article.publishedAt)
                    .createInDatabase(prisma),
            ),
        );
        return articles;
    }

    withBody(body: string): ArticleFactory {
        this.data.body = new Body(body);
        return this;
    }

    withCategory(category: string): ArticleFactory {
        this.data.category = new Category(category);
        return this;
    }

    withCountry(country: string): ArticleFactory {
        this.data.country = new Country(country);
        return this;
    }

    withCreatedAt(date: Date): ArticleFactory {
        this.data.createdAt = date;
        return this;
    }

    withHeadline(headline: string): ArticleFactory {
        this.data.headline = new Headline(headline);
        return this;
    }

    withLanguage(language: string): ArticleFactory {
        this.data.language = new Language(language);
        return this;
    }

    withPublishedAt(date: Date): ArticleFactory {
        this.data.publishedAt = date;
        return this;
    }

    withSummary(summary: string): ArticleFactory {
        this.data.summary = new Summary(summary);
        return this;
    }
}

/**
 * Static factory methods for common scenarios
 */
export class ArticleTestScenarios {
    static async createEmptyResultScenario(prisma: PrismaClient): Promise<void> {
        await new ArticleFactory().withCategory('technology').createInDatabase(prisma);
    }

    /**
     * Creates 4 French articles to meet morning target quota
     */
    static async createFrenchMorningTarget(prisma: PrismaClient): Promise<Article[]> {
        const testDate = new Date();

        return await Promise.all([
            new ArticleFactory()
                .withCountry('fr')
                .withLanguage('fr')
                .withCategory('technology')
                .withHeadline('Nouvelles Tech FR 1')
                .withCreatedAt(testDate)
                .asReal()
                .createInDatabase(prisma),

            new ArticleFactory()
                .withCountry('fr')
                .withLanguage('fr')
                .withCategory('politics')
                .withHeadline('Nouvelles Politiques FR 1')
                .withCreatedAt(testDate)
                .asFake('Contenu politique généré par IA')
                .createInDatabase(prisma),

            new ArticleFactory()
                .withCountry('fr')
                .withLanguage('fr')
                .withCategory('technology')
                .withHeadline('Nouvelles Tech FR 2')
                .withCreatedAt(testDate)
                .asReal()
                .createInDatabase(prisma),

            new ArticleFactory()
                .withCountry('fr')
                .withLanguage('fr')
                .withCategory('business')
                .withHeadline('Nouvelles Affaires FR 1')
                .withCreatedAt(testDate)
                .asFake('Informations commerciales trompeuses')
                .createInDatabase(prisma),
        ]);
    }

    static async createMixedArticles(prisma: PrismaClient): Promise<{
        allArticles: Article[];
        fakeArticles: Article[];
        frenchArticles: Article[];
        realArticles: Article[];
        usArticles: Article[];
    }> {
        const usArticles = await Promise.all([
            new ArticleFactory()
                .withCategory('technology')
                .withCountry('us')
                .withLanguage('en')
                .withHeadline('US Tech Innovation')
                .withCreatedAt(new Date('2024-03-01T12:00:00.000Z'))
                .asFake('AI-generated content')
                .createInDatabase(prisma),

            new ArticleFactory()
                .withCategory('politics')
                .withCountry('us')
                .withLanguage('en')
                .withHeadline('US Political Development')
                .withCreatedAt(new Date('2024-03-01T11:00:00.000Z'))
                .asReal()
                .createInDatabase(prisma),

            new ArticleFactory()
                .withCategory('technology')
                .withCountry('us')
                .withLanguage('en')
                .withHeadline('US Tech Update')
                .withCreatedAt(new Date('2024-03-01T10:00:00.000Z'))
                .asFake('Misleading information')
                .createInDatabase(prisma),
        ]);

        const frenchArticles = await Promise.all([
            new ArticleFactory()
                .withCategory('politics')
                .withCountry('fr')
                .withLanguage('fr')
                .withHeadline('Politique Française')
                .withCreatedAt(new Date('2024-03-01T12:00:00.000Z'))
                .asFake('Contenu généré par IA')
                .createInDatabase(prisma),

            new ArticleFactory()
                .withCategory('technology')
                .withCountry('fr')
                .withLanguage('fr')
                .withHeadline('Innovation Technologique')
                .withCreatedAt(new Date('2024-03-01T11:00:00.000Z'))
                .asReal()
                .createInDatabase(prisma),
        ]);

        const allArticles = [...usArticles, ...frenchArticles];
        const fakeArticles = allArticles.filter((article) => article.isFake());
        const realArticles = allArticles.filter((article) => !article.isFake());

        return {
            allArticles,
            fakeArticles,
            frenchArticles,
            realArticles,
            usArticles,
        };
    }

    static async createPaginationTestData(prisma: PrismaClient): Promise<Article[]> {
        return await new ArticleFactory()
            .withCategory('technology')
            .withCountry('us')
            .withLanguage('en')
            .withCreatedAt(new Date('2024-03-01T12:00:00.000Z'))
            .createManyInDatabase(prisma, 25);
    }
}
