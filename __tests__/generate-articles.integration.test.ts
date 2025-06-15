import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    mockOfDate,
} from '@jterrazz/test';

import { createTZDateForCountry } from '../src/shared/date/timezone.js';

import { ArticleTestScenarios } from './fixtures/article.factory.js';
import { worldNewsResolver } from './providers/api.worldnewsapi.com/top-news.resolver.js';
import { openRouterGenerateArticlesResolver } from './providers/openrouter.ai/open-router.resolver.js';
import {
    cleanupDatabase,
    cleanupIntegrationTest,
    type IntegrationTestContext,
    setupIntegrationTest,
} from './setup/integration.js';

describe('Task - Generate Articles - Integration Tests', () => {
    let testContext: IntegrationTestContext;

    beforeAll(async () => {
        testContext = await setupIntegrationTest([
            worldNewsResolver,
            openRouterGenerateArticlesResolver,
        ]);
    });

    beforeEach(async () => {
        await cleanupDatabase(testContext.prisma);
    });

    afterEach(async () => {
        await testContext.gateways.executor.stop();
        mockOfDate.reset();
    });

    afterAll(async () => {
        await cleanupIntegrationTest(testContext);
    });

    describe('Task Configuration', () => {
        it('should have correct task configuration', async () => {
            // Given
            const { tasks } = testContext.gateways;
            const articleGenerationTask = tasks.find((task) => task.name === 'article-generation');

            // Then
            expect(articleGenerationTask).toBeDefined();
            expect(articleGenerationTask?.schedule).toBe('0 */1 * * *');
            expect(articleGenerationTask?.executeOnStartup).toBe(true);
            expect(articleGenerationTask?.name).toBe('article-generation');
        });
    });

    describe('Task Execution', () => {
        it('should generate articles at 7:00 AM in France', async () => {
            // Given
            const mockDate = createTZDateForCountry(new Date(2020, 0, 1, 7, 0, 0, 0), 'fr');
            mockOfDate.set(mockDate);

            const initialCount = await testContext.prisma.article.count();
            expect(initialCount).toBe(0);

            const { tasks } = testContext.gateways;
            const articleGenerationTask = tasks.find((task) => task.name === 'article-generation');

            // When
            await expect(articleGenerationTask!.execute()).resolves.not.toThrow();

            // Then
            const articles = await testContext.prisma.article.findMany();
            const frArticles = articles.filter((a) => a.country === 'fr');
            const usArticles = articles.filter((a) => a.country === 'us');

            expect(frArticles.length).toBe(4);
            expect(usArticles.length).toBe(0);
        });

        it('should respect existing articles and not duplicate when target is met', async () => {
            // Given
            const mockDate = createTZDateForCountry(new Date(2020, 0, 1, 7, 0, 0, 0), 'fr');
            mockOfDate.set(mockDate);

            // Create 4 articles for France to meet morning target
            const createdArticles = await ArticleTestScenarios.createFrenchMorningTarget(
                testContext.prisma,
            );
            const expectedHeadlines = createdArticles.map((article) => article.headline.value);

            const { tasks } = testContext.gateways;
            const articleGenerationTask = tasks.find((task) => task.name === 'article-generation');

            // When
            await expect(articleGenerationTask!.execute()).resolves.not.toThrow();

            // Then
            const frArticles = await testContext.prisma.article.findMany({
                orderBy: { createdAt: 'asc' },
                where: { country: 'fr' },
            });

            // Should have exactly the 4 articles we created - no new ones generated
            expect(frArticles).toHaveLength(4);

            const actualHeadlines = frArticles.map((a) => a.headline);
            expectedHeadlines.forEach((expectedHeadline) => {
                expect(actualHeadlines).toContain(expectedHeadline);
            });
        }, 15000);

        it('should generate US articles in the afternoon when target increases', async () => {
            // Given - 2:00 PM French time (8:00 AM US time)
            const mockDate = createTZDateForCountry(new Date(2020, 0, 1, 14, 0, 0, 0), 'fr');
            mockOfDate.set(mockDate);

            // Create 4 French articles from the morning
            await ArticleTestScenarios.createFrenchMorningTarget(testContext.prisma);

            const { tasks } = testContext.gateways;
            const articleGenerationTask = tasks.find((task) => task.name === 'article-generation');

            // When
            await expect(articleGenerationTask!.execute()).resolves.not.toThrow();

            // Then
            const allArticles = await testContext.prisma.article.findMany({
                orderBy: { createdAt: 'asc' },
            });

            const frArticles = allArticles.filter((a) => a.country === 'fr');
            const usArticles = allArticles.filter((a) => a.country === 'us');

            // Should have 12 articles total (8 French + 4 US)
            expect(allArticles).toHaveLength(12);
            expect(frArticles).toHaveLength(8);
            expect(usArticles).toHaveLength(4);

            // Verify language combinations
            frArticles.forEach((article) => {
                expect(article.language).toBe('fr');
                expect(article.country).toBe('fr');
            });

            usArticles.forEach((article) => {
                expect(article.language).toBe('en');
                expect(article.country).toBe('us');
            });
        }, 15000);
    });
});
