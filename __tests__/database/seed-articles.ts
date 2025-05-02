import { type Category, type Country, type Language, type PrismaClient } from '@prisma/client';

export type ArticleFixtureParams = {
    category: Category;
    country: Country;
    createdAt: Date;
    isFake: boolean;
    language: Language;
    position: number;
};

export async function seedArticles(prisma: PrismaClient): Promise<void> {
    const articles = [
        // US articles
        createArticleFixture({
            category: 'TECHNOLOGY' as Category,
            country: 'us' as Country,
            createdAt: new Date('2024-03-01T12:00:00.000Z'),
            isFake: true,
            language: 'en' as Language,
            position: 1,
        }),
        createArticleFixture({
            category: 'POLITICS' as Category,
            country: 'us' as Country,
            createdAt: new Date('2024-03-01T11:00:00.000Z'),
            isFake: false,
            language: 'en' as Language,
            position: 2,
        }),
        createArticleFixture({
            category: 'TECHNOLOGY' as Category,
            country: 'us' as Country,
            createdAt: new Date('2024-03-01T10:00:00.000Z'),
            isFake: true,
            language: 'en' as Language,
            position: 3,
        }),
        // French articles
        createArticleFixture({
            category: 'POLITICS' as Category,
            country: 'fr' as Country,
            createdAt: new Date('2024-03-01T12:00:00.000Z'),
            isFake: true,
            language: 'fr' as Language,
            position: 4,
        }),
        createArticleFixture({
            category: 'TECHNOLOGY' as Category,
            country: 'fr' as Country,
            createdAt: new Date('2024-03-01T11:00:00.000Z'),
            isFake: false,
            language: 'fr' as Language,
            position: 5,
        }),
    ];

    for (const article of articles) {
        await prisma.article.create({ data: article });
    }
}

function createArticleFixture(params: ArticleFixtureParams) {
    const { category, country, createdAt, isFake, language, position } = params;
    return {
        article: `This is article ${position} about ${category.toLowerCase()}. The content discusses various aspects and their potential impacts.`,
        category,
        country,
        createdAt,
        fakeReason: isFake ? 'AI-generated content' : null,
        headline: `${category} Article ${position}`,
        isFake,
        language,
        summary: `A comprehensive summary of ${category.toLowerCase()} article ${position}. This article explores key developments and their implications in detail.`,
    };
}
