import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jterrazz/test';

import { cleanDatabase } from './database/clean.js';
import { ArticleFactory, ArticleTestScenarios } from './fixtures/article.factory.js';
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
    });

    afterAll(async () => {
        await cleanupIntegrationTest(testContext);
    });

    describe('Successful requests', () => {
        it('should return paginated articles with default parameters', async () => {
            // Given - a set of articles in the database using factory
            const { prisma } = testContext;
            const { usArticles } = await ArticleTestScenarios.createMixedArticles(prisma);
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
                        contentRaw: expect.any(String),
                        contentWithAnnotations: expect.any(String),
                        country: 'us',
                        createdAt: expect.any(String),
                        fakeReason: expect.anything(), // null or string
                        headline: expect.any(String),
                        id: expect.any(String),
                        isFake: expect.any(Boolean),
                        language: 'en',
                        summary: expect.any(String),
                    }),
                ]),
                nextCursor: null,
                total: expect.any(Number), // Should be null when all items fit on one page
            });

            // Default parameters should return US articles in English
            expect(data.items).toHaveLength(usArticles.length);
            expect(data.total).toBe(usArticles.length);

            // Verify articles are ordered by creation date (newest first)
            const dates = data.items.map((item) => new Date(item.createdAt));
            for (let i = 1; i < dates.length; i++) {
                expect(dates[i - 1].getTime()).toBeGreaterThanOrEqual(dates[i].getTime());
            }
        });

        it('should filter articles by category and country', async () => {
            // Given - articles exist in the database with different categories and countries
            const { prisma } = testContext;
            await ArticleTestScenarios.createMixedArticles(prisma);
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
            expect(data.total).toBe(1);
        });

        it('should handle pagination with limit', async () => {
            // Given - multiple articles exist in the database for pagination testing
            const { prisma } = testContext;
            await new ArticleFactory()
                .withCategory('technology')
                .withCountry('us')
                .withLanguage('en')
                .createManyInDatabase(prisma, 5); // Create 5 articles for pagination

            const { httpServer } = testContext.gateways;

            // Verify test data exists
            const dbArticles = await prisma.article.findMany({
                orderBy: { createdAt: 'desc' },
                where: { country: 'us' },
            });
            expect(dbArticles).toHaveLength(5);

            // When - requesting the first page of articles
            const firstResponse = await httpServer.request('/articles?limit=2');
            const firstData = await firstResponse.json();

            // Then - it should return the first page of articles
            expect(firstResponse.status).toBe(200);
            expect(firstData.items).toHaveLength(2);
            expect(firstData.total).toBe(5);
            expect(firstData.nextCursor).toBeDefined();
            expect(firstData.nextCursor).not.toBeNull();

            // When - requesting the next page using the cursor
            const secondResponse = await httpServer.request(
                `/articles?limit=2&cursor=${firstData.nextCursor}`,
            );
            const secondData = await secondResponse.json();

            // Then - it should return the second page of articles
            expect(secondResponse.status).toBe(200);
            expect(secondData.items).toHaveLength(2);
            expect(secondData.nextCursor).toBeDefined();

            // Verify no duplicates between pages
            const firstPageIds = new Set(firstData.items.map((item) => item.id));
            const secondPageIds = new Set(secondData.items.map((item) => item.id));
            const hasOverlap = [...secondPageIds].some((id) => firstPageIds.has(id));
            expect(hasOverlap).toBe(false);
        });

        it('should handle empty results gracefully', async () => {
            // Given - only non-entertainment articles exist
            const { prisma } = testContext;
            await ArticleTestScenarios.createEmptyResultScenario(prisma);
            const { httpServer } = testContext.gateways;

            // When - requesting articles with filters that match nothing (no entertainment articles exist)
            const response = await httpServer.request('/articles?category=entertainment');

            // Then - it should return empty results
            const data = await response.json();
            expect(response.status).toBe(200);
            expect(data.items).toEqual([]);
            expect(data.total).toBe(0);
            expect(data.nextCursor).toBeNull();
        });

        it('should respect pagination limits', async () => {
            // Given - articles exist in the database
            const { prisma } = testContext;
            await new ArticleFactory()
                .withCategory('technology')
                .withCountry('us')
                .createManyInDatabase(prisma, 3);
            const { httpServer } = testContext.gateways;

            // When - requesting with limit of 1
            const response = await httpServer.request('/articles?limit=1');
            const data = await response.json();

            // Then - it should return exactly 1 item
            expect(response.status).toBe(200);
            expect(data.items).toHaveLength(1);
            expect(data.total).toBe(3);
            expect(data.nextCursor).toBeDefined();
        });

        it('should handle maximum page size limit', async () => {
            // Given - articles exist in the database
            const { prisma } = testContext;
            await new ArticleFactory().createInDatabase(prisma);
            const { httpServer } = testContext.gateways;

            // When - requesting with limit at the maximum (100)
            const response = await httpServer.request('/articles?limit=100');
            const data = await response.json();

            // Then - it should accept the maximum limit
            expect(response.status).toBe(200);
            expect(data.items.length).toBeLessThanOrEqual(100);
        });

        it('should return exact article content and structure', async () => {
            // Given - a specific article with known content
            const { prisma } = testContext;
            const testDate = new Date('2024-03-15T14:30:00.000Z');

            await new ArticleFactory()
                .withCategory('technology')
                .withCountry('us')
                .withLanguage('en')
                .withHeadline('Revolutionary AI Breakthrough Announced')
                .withContent(
                    'Scientists at leading universities have announced a groundbreaking advancement in artificial intelligence technology. The new system demonstrates unprecedented capabilities in natural language understanding and generation, marking a significant milestone in AI development.',
                )
                .withSummary(
                    'A major breakthrough in AI technology has been announced by university researchers, showcasing advanced natural language processing capabilities.',
                )
                .withCreatedAt(testDate)
                .asFake('Exaggerated claims about AI capabilities')
                .createInDatabase(prisma);

            const { httpServer } = testContext.gateways;

            // When - requesting this specific article
            const response = await httpServer.request(
                '/articles?category=technology&country=us&limit=1',
            );
            const data = await response.json();

            // Then - should return exact content and structure
            expect(response.status).toBe(200);
            expect(data).toMatchObject({
                items: expect.any(Array),
                nextCursor: null,
                total: 1,
            });

            expect(data.items).toHaveLength(1);

            const article = data.items[0];

            // Validate exact structure and content
            expect(article).toEqual({
                article:
                    'Scientists at leading universities have announced a groundbreaking advancement in artificial intelligence technology. The new system demonstrates unprecedented capabilities in natural language understanding and generation, marking a significant milestone in AI development.',
                // Metadata fields
                category: 'technology',
                contentRaw:
                    'Scientists at leading universities have announced a groundbreaking advancement in artificial intelligence technology. The new system demonstrates unprecedented capabilities in natural language understanding and generation, marking a significant milestone in AI development.',
                contentWithAnnotations:
                    'Scientists at leading universities have announced a groundbreaking advancement in artificial intelligence technology. The new system demonstrates unprecedented capabilities in natural language understanding and generation, marking a significant milestone in AI development.',
                country: 'us',

                createdAt: '2024-03-15T14:30:00.000Z',
                fakeReason: 'Exaggerated claims about AI capabilities',
                // Core content fields
                headline: 'Revolutionary AI Breakthrough Announced',
                // System fields
                id: expect.stringMatching(
                    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
                ), // UUID format

                // Authenticity fields
                isFake: true,
                language: 'en',

                summary:
                    'A major breakthrough in AI technology has been announced by university researchers, showcasing advanced natural language processing capabilities.',
            });

            // Validate specific content characteristics
            expect(article.headline).toContain('Revolutionary AI Breakthrough');
            expect(article.summary).toContain('breakthrough in AI technology');
            expect(article.article).toContain('Scientists at leading universities');
            expect(article.article).toContain('artificial intelligence technology');
            expect(typeof article.isFake).toBe('boolean');
            expect(article.fakeReason).toBeTruthy();
            expect(article.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/); // ISO date format
        });

        it('should handle specific article filtering scenarios', async () => {
            // Given - specific articles created for targeted testing
            const { prisma } = testContext;

            await new ArticleFactory()
                .withCategory('politics')
                .withCountry('us')
                .withLanguage('en')
                .withHeadline('US Political News')
                .asFake('AI-generated political content')
                .createInDatabase(prisma);

            await new ArticleFactory()
                .withCategory('science')
                .withCountry('fr')
                .withLanguage('fr')
                .withHeadline('French Scientific Discovery')
                .asReal()
                .createInDatabase(prisma);

            const { httpServer } = testContext.gateways;

            // When - filtering by specific criteria
            const politicsResponse = await httpServer.request(
                '/articles?category=politics&country=us',
            );
            const politicsData = await politicsResponse.json();

            const scienceResponse = await httpServer.request(
                '/articles?category=science&country=fr',
            );
            const scienceData = await scienceResponse.json();

            // Then - should return correct filtered results
            expect(politicsData.items).toHaveLength(1);
            expect(politicsData.items[0]).toMatchObject({
                category: 'politics',
                country: 'us',
                isFake: true,
            });

            expect(scienceData.items).toHaveLength(1);
            expect(scienceData.items[0]).toMatchObject({
                category: 'science',
                country: 'fr',
                isFake: false,
            });
        });
    });

    describe('Error handling', () => {
        beforeEach(async () => {
            // Create minimal test data for error scenarios
            const { prisma } = testContext;
            await new ArticleFactory().createInDatabase(prisma);
        });

        it('should handle invalid cursor formats gracefully', async () => {
            // Given - the database contains articles
            const { httpServer } = testContext.gateways;

            // When - requesting articles with an invalid cursor format
            const invalidCursorResponse = await httpServer.request(
                '/articles?cursor=invalid-cursor',
            );

            // Then - it should return a 422 error with an appropriate message
            expect(invalidCursorResponse.status).toBe(422);
            expect(await invalidCursorResponse.json()).toMatchObject({
                error: 'Invalid request parameters',
            });
        });

        it('should handle invalid base64 cursor with invalid timestamp', async () => {
            // Given - the database contains articles
            const { httpServer } = testContext.gateways;

            // When - requesting articles with a valid base64 but invalid timestamp
            const invalidTimestampResponse = await httpServer.request(
                `/articles?cursor=${Buffer.from('not-a-timestamp').toString('base64')}`,
            );

            // Then - it should return a 422 error with an appropriate message
            expect(invalidTimestampResponse.status).toBe(422);
            expect(await invalidTimestampResponse.json()).toMatchObject({
                error: 'Invalid request parameters',
            });
        });

        it('should handle invalid category parameter', async () => {
            // Given - the database contains articles
            const { httpServer } = testContext.gateways;

            // When - requesting articles with an invalid category
            const response = await httpServer.request('/articles?category=INVALID');

            // Then - it should return a 422 error with an appropriate message
            expect(response.status).toBe(422);
            expect(await response.json()).toMatchObject({
                error: 'Invalid request parameters',
            });
        });

        it('should handle invalid country parameter', async () => {
            // Given - the database contains articles
            const { httpServer } = testContext.gateways;

            // When - requesting articles with an invalid country
            const response = await httpServer.request('/articles?country=INVALID');

            // Then - it should return a 422 error
            expect(response.status).toBe(422);
            expect(await response.json()).toMatchObject({
                error: 'Invalid request parameters',
            });
        });

        it('should handle invalid language parameter', async () => {
            // Given - the database contains articles
            const { httpServer } = testContext.gateways;

            // When - requesting articles with an invalid language
            const response = await httpServer.request('/articles?language=INVALID');

            // Then - it should return a 422 error
            expect(response.status).toBe(422);
            expect(await response.json()).toMatchObject({
                error: 'Invalid request parameters',
            });
        });

        it('should handle invalid limit parameters', async () => {
            // Given - the database contains articles
            const { httpServer } = testContext.gateways;

            // When - requesting articles with negative limit
            const negativeResponse = await httpServer.request('/articles?limit=-1');
            expect(negativeResponse.status).toBe(422);

            // When - requesting articles with zero limit
            const zeroResponse = await httpServer.request('/articles?limit=0');
            expect(zeroResponse.status).toBe(422);

            // When - requesting articles with non-numeric limit
            const nonNumericResponse = await httpServer.request('/articles?limit=abc');
            expect(nonNumericResponse.status).toBe(422);
        });

        it('should handle multiple invalid parameters', async () => {
            // Given - the database contains articles
            const { httpServer } = testContext.gateways;

            // When - requesting articles with multiple invalid parameters
            const response = await httpServer.request(
                '/articles?category=INVALID&country=INVALID&language=INVALID&limit=-1',
            );

            // Then - it should return a 422 error
            expect(response.status).toBe(422);
            expect(await response.json()).toMatchObject({
                error: 'Invalid request parameters',
            });
        });
    });

    describe('Edge cases', () => {
        it('should handle cursor at the end of data', async () => {
            // Given - articles exist and we get the last page
            const { prisma } = testContext;
            await new ArticleFactory().withCountry('us').createManyInDatabase(prisma, 3);
            const { httpServer } = testContext.gateways;

            // When - getting the last page
            const firstResponse = await httpServer.request('/articles?limit=3');
            const firstData = await firstResponse.json();

            // Should have no cursor since all items fit in one page
            expect(firstData.nextCursor).toBeNull();
            expect(firstData.items).toHaveLength(3);
        });

        it('should handle case-insensitive parameter transformation', async () => {
            // Given - articles exist in the database
            const { prisma } = testContext;
            await new ArticleFactory()
                .withCategory('technology')
                .withCountry('us')
                .withLanguage('en')
                .createManyInDatabase(prisma, 2);
            const { httpServer } = testContext.gateways;

            // When - requesting with uppercase parameters
            const response = await httpServer.request(
                '/articles?category=TECHNOLOGY&country=US&language=EN',
            );
            const data = await response.json();

            // Then - it should handle case transformation correctly
            expect(response.status).toBe(200);
            expect(
                data.items.every(
                    (item) =>
                        item.category === 'technology' &&
                        item.country === 'us' &&
                        item.language === 'en',
                ),
            ).toBe(true);
        });

        it('should handle article content fields correctly', async () => {
            // Given - articles exist in the database
            const { prisma } = testContext;
            await new ArticleFactory()
                .withHeadline('Test Content Fields Article')
                .asFake('Test reason for content verification')
                .createInDatabase(prisma);
            const { httpServer } = testContext.gateways;

            // When - requesting articles
            const response = await httpServer.request('/articles?limit=1');
            const data = await response.json();

            // Then - content fields should be properly formatted
            expect(response.status).toBe(200);
            expect(data.items).toHaveLength(1);

            const article = data.items[0];
            expect(article.contentRaw).toBeDefined();
            expect(article.contentWithAnnotations).toBeDefined();
            expect(article.article).toBe(article.contentRaw); // Backward compatibility
            expect(typeof article.isFake).toBe('boolean');

            if (article.isFake) {
                expect(article.fakeReason).toBeDefined();
                expect(typeof article.fakeReason).toBe('string');
            } else {
                expect(article.fakeReason).toBeNull();
            }
        });

        it('should handle mixed authenticity articles correctly', async () => {
            // Given - mix of real and fake articles
            const { prisma } = testContext;
            await new ArticleFactory()
                .withCategory('technology')
                .withHeadline('Real Tech News')
                .asReal()
                .createInDatabase(prisma);

            await new ArticleFactory()
                .withCategory('technology')
                .withHeadline('Fake Tech News')
                .asFake('Fabricated information')
                .createInDatabase(prisma);

            const { httpServer } = testContext.gateways;

            // When - requesting all technology articles
            const response = await httpServer.request('/articles?category=technology');
            const data = await response.json();

            // Then - should return both articles with correct authenticity
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
});
