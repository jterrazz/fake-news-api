import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jterrazz/test';

import { cleanDatabase } from './database/clean.js';
import { seedArticles } from './database/seed-articles.js';
import {
    cleanupIntegrationTest,
    type IntegrationTestContext,
    setupIntegrationTest,
} from './setup/integration.js';

describe('HTTP - Get Articles - Integration Tests', () => {
    let testContext: IntegrationTestContext;

    beforeAll(async () => {
        testContext = await setupIntegrationTest();
    });

    beforeEach(async () => {
        const { prisma } = testContext;

        await cleanDatabase(prisma);
        await seedArticles(prisma);
    });

    afterAll(async () => {
        await cleanupIntegrationTest(testContext);
    });

    it('should return paginated articles with default parameters', async () => {
        // Given - a set of articles in the database
        const { httpServer } = testContext.gateways;

        // When - requesting articles with default parameters
        const response = await httpServer.request('/articles');
        const data = await response.json();

        // Then - it should return paginated articles
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
        // Given - articles exist in the database with different categories and countries
        const { httpServer } = testContext.gateways;

        // When - requesting articles filtered by category and country
        const response = await httpServer.request(
            '/articles?category=technology&country=fr&language=fr',
        );
        const data = await response.json();

        // Then - it should return only the matching articles
        expect(response.status).toBe(200);
        expect(data.items).toHaveLength(1);
        expect(data.items[0]).toMatchObject({
            category: 'technology',
            country: 'fr',
            language: 'fr',
        });
    });

    it('should handle pagination with limit', async () => {
        // Given - multiple articles exist in the database
        const { httpServer, prisma } = { ...testContext.gateways, prisma: testContext.prisma };

        // Verify test data exists
        const dbArticles = await prisma.article.findMany({
            orderBy: { createdAt: 'desc' },
            where: { country: 'us' },
        });
        expect(dbArticles).toHaveLength(3);

        // When - requesting the first and second page of articles
        const firstResponse = await httpServer.request('/articles?limit=2');
        const firstData = await firstResponse.json();

        // Then - it should return the first page of articles
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

        // When - requesting the next page using the cursor
        const secondResponse = await httpServer.request(
            `/articles?limit=2&cursor=${firstData.nextCursor}`,
        );
        const secondData = await secondResponse.json();

        // Then - it should return the second page of articles
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
        // Given - the database contains articles
        const { httpServer } = testContext.gateways;

        // When - requesting articles with an invalid cursor format
        const invalidCursorResponse = await httpServer.request('/articles?cursor=invalid-cursor');

        // Then - it should return a 422 error with an appropriate message
        expect(invalidCursorResponse.status).toBe(422);
        expect(await invalidCursorResponse.json()).toMatchObject({
            error: expect.stringContaining('Invalid cursor'),
        });

        // When - requesting articles with a valid base64 but invalid timestamp
        const invalidTimestampResponse = await httpServer.request(
            `/articles?cursor=${Buffer.from('not-a-timestamp').toString('base64')}`,
        );

        // Then - it should return a 422 error with an appropriate message
        expect(invalidTimestampResponse.status).toBe(422);
        expect(await invalidTimestampResponse.json()).toMatchObject({
            error: expect.stringContaining('Invalid cursor'),
        });
    });

    it('should handle invalid parameters gracefully', async () => {
        // Given - the database contains articles
        const { httpServer } = testContext.gateways;

        // When - requesting articles with an invalid category
        const response = await httpServer.request('/articles?category=INVALID');

        // Then - it should return a 400 error with an appropriate message
        expect(response.status).toBe(400);
        expect(await response.json()).toMatchObject({
            error: expect.any(String),
        });
    });
});
