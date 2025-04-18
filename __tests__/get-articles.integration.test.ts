import { Category, Country, Language } from '@prisma/client';

import {
    cleanupIntegrationTest,
    type IntegrationTestContext,
    setupIntegrationTest,
} from './support/integration.js';

describe('HTTP - Get Articles - Integration Tests', () => {
    let testContext: IntegrationTestContext;

    // Helper to create test article data
    const createTestArticle = (params: {
        category: Category;
        country: Country;
        createdAt: Date;
        isFake: boolean;
        language: Language;
        position: number;
    }) => {
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
            summary: `Summary of ${category.toLowerCase()} article ${position}`,
        };
    };

    beforeAll(async () => {
        testContext = await setupIntegrationTest();
    });

    beforeEach(async () => {
        const { prisma } = testContext;

        // Clean up articles before each test
        await prisma.article.deleteMany();

        // Create test articles with different categories, dates, and languages
        const articles = [
            // US articles
            createTestArticle({
                category: 'TECHNOLOGY' as Category,
                country: 'us' as Country,
                createdAt: new Date('2024-03-01T12:00:00.000Z'),
                isFake: true,
                language: 'en' as Language,
                position: 1,
            }),
            createTestArticle({
                category: 'POLITICS' as Category,
                country: 'us' as Country,
                createdAt: new Date('2024-03-01T11:00:00.000Z'),
                isFake: false,
                language: 'en' as Language,
                position: 2,
            }),
            createTestArticle({
                category: 'TECHNOLOGY' as Category,
                country: 'us' as Country,
                createdAt: new Date('2024-03-01T10:00:00.000Z'),
                isFake: true,
                language: 'en' as Language,
                position: 3,
            }),
            // French articles
            createTestArticle({
                category: 'POLITICS' as Category,
                country: 'fr' as Country,
                createdAt: new Date('2024-03-01T12:00:00.000Z'),
                isFake: true,
                language: 'fr' as Language,
                position: 4,
            }),
            createTestArticle({
                category: 'TECHNOLOGY' as Category,
                country: 'fr' as Country,
                createdAt: new Date('2024-03-01T11:00:00.000Z'),
                isFake: false,
                language: 'fr' as Language,
                position: 5,
            }),
        ];

        // Insert test articles
        for (const article of articles) {
            await prisma.article.create({ data: article });
        }
    });

    afterAll(async () => {
        await cleanupIntegrationTest(testContext);
    });

    it('should return paginated articles with default parameters', async () => {
        // Given
        const { httpServer } = testContext;

        // When
        const response = await httpServer.request('/articles');
        const data = await response.json();

        // Then
        expect(response.status).toBe(200);
        expect(data).toMatchObject({
            items: expect.arrayContaining([
                expect.objectContaining({
                    article: expect.any(String),
                    category: expect.stringMatching(/^(technology|politics)$/),
                    country: 'us',
                    createdAt: expect.any(String),
                    headline: expect.any(String),
                    id: expect.any(String),
                    isFake: expect.any(Boolean),
                    language: 'en',
                    summary: expect.any(String),
                }),
            ]),
            total: expect.any(Number),
        });

        // Default parameters should return US articles in English
        expect(data.items).toHaveLength(3);
        expect(data.total).toBe(3);
    });

    it('should filter articles by category and country', async () => {
        // Given
        const { httpServer } = testContext;

        // When
        const response = await httpServer.request(
            '/articles?category=technology&country=fr&language=fr',
        );
        const data = await response.json();

        // Then
        expect(response.status).toBe(200);
        expect(data.items).toHaveLength(1);
        expect(data.items[0]).toMatchObject({
            category: 'technology',
            country: 'fr',
            language: 'fr',
        });
    });

    it('should handle pagination with limit', async () => {
        // Given
        const { httpServer, prisma } = testContext;

        // Verify test data exists
        const dbArticles = await prisma.article.findMany({
            orderBy: { createdAt: 'desc' },
            where: { country: 'us' },
        });
        expect(dbArticles).toHaveLength(3);

        // When - Get first page of articles
        const firstResponse = await httpServer.request('/articles?limit=2');
        const firstData = await firstResponse.json();

        // Then - verify first page
        expect(firstResponse.status).toBe(200);
        expect(firstData.items).toHaveLength(2);
        expect(firstData.total).toBe(3);
        expect(firstData.nextCursor).toBeDefined();

        // Verify first page contains the newest articles
        expect(new Date(firstData.items[0].createdAt).toISOString()).toBe(
            '2024-03-01T12:00:00.000Z',
        );
        expect(new Date(firstData.items[1].createdAt).toISOString()).toBe(
            '2024-03-01T11:00:00.000Z',
        );

        // When - Get next page using cursor
        const secondResponse = await httpServer.request(
            `/articles?limit=2&cursor=${firstData.nextCursor}`,
        );
        const secondData = await secondResponse.json();

        // Then - verify second page
        expect(secondResponse.status).toBe(200);
        expect(secondData.items).toHaveLength(1);

        // Verify the article is the oldest one
        const secondPageArticle = secondData.items[0];
        expect(secondPageArticle.category.toLowerCase()).toBe('technology');
        expect(new Date(secondPageArticle.createdAt).toISOString()).toBe(
            '2024-03-01T10:00:00.000Z',
        );

        // Verify no duplicates between pages
        const firstPageIds = new Set(firstData.items.map((item) => item.id));
        const secondPageIds = new Set(secondData.items.map((item) => item.id));
        const hasOverlap = [...secondPageIds].some((id) => firstPageIds.has(id));
        expect(hasOverlap).toBe(false);
    });

    it('should handle invalid cursor gracefully', async () => {
        // Given
        const { httpServer } = testContext;

        // When - Invalid cursor format
        const invalidCursorResponse = await httpServer.request('/articles?cursor=invalid-cursor');

        // Then
        expect(invalidCursorResponse.status).toBe(500);
        expect(await invalidCursorResponse.json()).toMatchObject({
            error: expect.stringContaining('Invalid cursor'),
        });

        // When - Valid base64 but invalid timestamp
        const invalidTimestampResponse = await httpServer.request(
            `/articles?cursor=${Buffer.from('not-a-timestamp').toString('base64')}`,
        );

        // Then
        expect(invalidTimestampResponse.status).toBe(500);
        expect(await invalidTimestampResponse.json()).toMatchObject({
            error: expect.stringContaining('Invalid cursor'),
        });
    });

    it('should handle invalid parameters gracefully', async () => {
        // Given
        const { httpServer } = testContext;

        // When - Invalid category
        const response = await httpServer.request('/articles?category=INVALID');

        // Then
        expect(response.status).toBe(500);
        expect(await response.json()).toMatchObject({
            error: expect.any(String),
        });
    });
});
