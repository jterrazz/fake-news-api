import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jterrazz/test';

import { ArticleFactory, ArticleTestScenarios } from './fixtures/article.factory.js';
import {
    cleanupDatabase,
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
        await cleanupDatabase(testContext.prisma);
    });

    afterAll(async () => {
        await cleanupIntegrationTest(testContext);
    });

    describe('Successful requests', () => {
        it('should return paginated articles with default parameters', async () => {
            // Given
            const { usArticles } = await ArticleTestScenarios.createMixedArticles(
                testContext.prisma,
            );

            // When
            const response = await testContext.gateways.httpServer.request('/articles');
            const data = await response.json();

            // Then
            expect(response.status).toBe(200);
            expect(data.items).toHaveLength(usArticles.length);
            expect(data.total).toBe(usArticles.length);
            expect(data.nextCursor).toBeNull();

            // Verify default filtering (US articles in English)
            data.items.forEach((item) => {
                expect(item.country).toBe('us');
                expect(item.language).toBe('en');
            });

            // Verify ordering (newest first)
            const dates = data.items.map((item) => new Date(item.createdAt));
            for (let i = 1; i < dates.length; i++) {
                expect(dates[i - 1].getTime()).toBeGreaterThanOrEqual(dates[i].getTime());
            }
        });

        it('should filter articles by category and country', async () => {
            // Given
            await ArticleTestScenarios.createMixedArticles(testContext.prisma);

            // When
            const response = await testContext.gateways.httpServer.request(
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
            expect(data.total).toBe(1);
        });

        it('should handle pagination correctly', async () => {
            // Given
            await new ArticleFactory()
                .withCountry('us')
                .createManyInDatabase(testContext.prisma, 5);

            // When - first page
            const firstResponse =
                await testContext.gateways.httpServer.request('/articles?limit=2');
            const firstData = await firstResponse.json();

            // Then
            expect(firstResponse.status).toBe(200);
            expect(firstData.items).toHaveLength(2);
            expect(firstData.total).toBe(5);
            expect(firstData.nextCursor).toBeDefined();

            // When - second page
            const secondResponse = await testContext.gateways.httpServer.request(
                `/articles?limit=2&cursor=${firstData.nextCursor}`,
            );
            const secondData = await secondResponse.json();

            // Then - verify no duplicates between pages
            expect(secondResponse.status).toBe(200);
            expect(secondData.items).toHaveLength(2);

            const firstPageIds = new Set(firstData.items.map((item) => item.id));
            const secondPageIds = new Set(secondData.items.map((item) => item.id));
            const hasOverlap = [...secondPageIds].some((id) => firstPageIds.has(id));
            expect(hasOverlap).toBe(false);
        });

        it('should handle empty results gracefully', async () => {
            // Given
            await ArticleTestScenarios.createEmptyResultScenario(testContext.prisma);

            // When
            const response = await testContext.gateways.httpServer.request(
                '/articles?category=entertainment',
            );
            const data = await response.json();

            // Then
            expect(response.status).toBe(200);
            expect(data.items).toEqual([]);
            expect(data.total).toBe(0);
            expect(data.nextCursor).toBeNull();
        });

        it('should return exact article content and structure', async () => {
            // Given
            await new ArticleFactory()
                .withCategory('technology')
                .withCountry('us')
                .withLanguage('en')
                .withHeadline('Revolutionary AI Breakthrough Announced')
                .withContent(
                    'Scientists at leading universities have announced a groundbreaking advancement.',
                )
                .withSummary('A major breakthrough in AI technology has been announced.')
                .withCreatedAt(new Date('2024-03-15T14:30:00.000Z'))
                .asFake('Exaggerated claims about AI capabilities')
                .createInDatabase(testContext.prisma);

            // When
            const response = await testContext.gateways.httpServer.request('/articles?limit=1');
            const data = await response.json();

            // Then
            expect(response.status).toBe(200);
            expect(data.items).toHaveLength(1);

            const article = data.items[0];
            expect(article).toMatchObject({
                category: 'technology',
                country: 'us',
                createdAt: '2024-03-15T14:30:00.000Z',
                fakeReason: 'Exaggerated claims about AI capabilities',
                headline: 'Revolutionary AI Breakthrough Announced',
                isFake: true,
                language: 'en',
            });
            expect(article.id).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
            );
        });

        it('should handle mixed authenticity articles correctly', async () => {
            // Given
            await Promise.all([
                new ArticleFactory()
                    .withCategory('technology')
                    .withHeadline('Real Tech News')
                    .asReal()
                    .createInDatabase(testContext.prisma),
                new ArticleFactory()
                    .withCategory('technology')
                    .withHeadline('Fake Tech News')
                    .asFake('Fabricated information')
                    .createInDatabase(testContext.prisma),
            ]);

            // When
            const response = await testContext.gateways.httpServer.request(
                '/articles?category=technology',
            );
            const data = await response.json();

            // Then
            expect(response.status).toBe(200);
            expect(data.items).toHaveLength(2);

            const realArticle = data.items.find((item) => item.headline.includes('Real'));
            const fakeArticle = data.items.find((item) => item.headline.includes('Fake'));

            expect(realArticle.isFake).toBe(false);
            expect(realArticle.fakeReason).toBeNull();
            expect(fakeArticle.isFake).toBe(true);
            expect(fakeArticle.fakeReason).toBe('Fabricated information');
        });
    });

    describe('Error handling', () => {
        beforeEach(async () => {
            await new ArticleFactory().createInDatabase(testContext.prisma);
        });

        it('should handle invalid parameters with 422 status', async () => {
            const testCases = [
                { description: 'invalid cursor', path: '/articles?cursor=invalid-cursor' },
                {
                    description: 'invalid base64 cursor',
                    path: `/articles?cursor=${Buffer.from('not-a-timestamp').toString('base64')}`,
                },
                { description: 'invalid category', path: '/articles?category=INVALID' },
                { description: 'invalid country', path: '/articles?country=INVALID' },
                { description: 'invalid language', path: '/articles?language=INVALID' },
                { description: 'negative limit', path: '/articles?limit=-1' },
                { description: 'zero limit', path: '/articles?limit=0' },
                { description: 'non-numeric limit', path: '/articles?limit=abc' },
            ];

            for (const testCase of testCases) {
                const response = await testContext.gateways.httpServer.request(testCase.path);
                expect(response.status).toBe(422);
                expect(await response.json()).toMatchObject({
                    error: 'Invalid request parameters',
                });
            }
        });
    });

    describe('Edge cases', () => {
        it('should handle case-insensitive parameters', async () => {
            // Given
            await new ArticleFactory()
                .withCategory('technology')
                .withCountry('us')
                .withLanguage('en')
                .createInDatabase(testContext.prisma);

            // When
            const response = await testContext.gateways.httpServer.request(
                '/articles?category=TECHNOLOGY&country=US&language=EN',
            );
            const data = await response.json();

            // Then
            expect(response.status).toBe(200);
            expect(data.items[0]).toMatchObject({
                category: 'technology',
                country: 'us',
                language: 'en',
            });
        });

        it('should handle cursor at end of data', async () => {
            // Given
            await new ArticleFactory()
                .withCountry('us')
                .createManyInDatabase(testContext.prisma, 3);

            // When
            const response = await testContext.gateways.httpServer.request('/articles?limit=3');
            const data = await response.json();

            // Then
            expect(data.nextCursor).toBeNull();
            expect(data.items).toHaveLength(3);
        });
    });
});
