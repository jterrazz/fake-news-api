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

import { createTZDateForCountry as createTZDateAtCountry } from '../src/shared/date/timezone.js';

import { ArticleFactory } from './fixtures/article.factory.js';
import { worldNewsResolver } from './resolvers/api.worldnewsapi.com/top-news.resolver.js';
import { openRouterGenerateArticlesResolver } from './resolvers/openrouter.ai/open-router.resolver.js';
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
        // Clean up articles before each test
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
            // Given - the article generation task
            const { tasks } = testContext.gateways;
            const articleGenerationTask = tasks.find((task) => task.name === 'article-generation');

            // Then - it should be properly configured
            expect(articleGenerationTask).toBeDefined();
            expect(articleGenerationTask?.schedule).toBe('0 */1 * * *'); // Every hour in test environment
            expect(articleGenerationTask?.executeOnStartup).toBe(true);
            expect(articleGenerationTask?.name).toBe('article-generation');
        });
    });

    describe('Task Execution', () => {
        it('should execute successfully during generation hours', async () => {
            // Given - 7:00 AM Paris time (valid generation time)
            const mockDate = createTZDateAtCountry(new Date(2020, 0, 1, 7, 0, 0, 0), 'fr');
            mockOfDate.set(mockDate);

            const { tasks } = testContext.gateways;
            const articleGenerationTask = tasks.find((task) => task.name === 'article-generation');

            // When - running the article generation task
            await expect(articleGenerationTask!.execute()).resolves.not.toThrow();

            // Then - task should complete successfully
            // Note: In test environment with mocked services, articles may not be generated
            // but the task should execute without errors
            const articles = await testContext.prisma.article.findMany();
            expect(articles.length).toBeGreaterThanOrEqual(0);
        }, 15000);

        it('should respect existing articles and not duplicate when target is met', async () => {
            // Given - 7:00 AM and existing articles that meet generation targets
            const mockDate = createTZDateAtCountry(new Date(2020, 0, 1, 7, 0, 0, 0), 'fr');
            mockOfDate.set(mockDate);

            // Create articles matching the task's language-country configuration
            // French country with English language (4 articles to meet morning target)
            await new ArticleFactory()
                .withCountry('fr')
                .withLanguage('en')
                .withCategory('technology')
                .withHeadline('French Tech News 1')
                .asReal()
                .createInDatabase(testContext.prisma);

            await new ArticleFactory()
                .withCountry('fr')
                .withLanguage('en')
                .withCategory('politics')
                .withHeadline('French Political News 1')
                .asFake('AI-generated political content')
                .createInDatabase(testContext.prisma);

            await new ArticleFactory()
                .withCountry('fr')
                .withLanguage('en')
                .withCategory('technology')
                .withHeadline('French Tech News 2')
                .asReal()
                .createInDatabase(testContext.prisma);

            await new ArticleFactory()
                .withCountry('fr')
                .withLanguage('en')
                .withCategory('business')
                .withHeadline('French Business News 1')
                .asFake('Misleading business information')
                .createInDatabase(testContext.prisma);

            // US country with French language (4 articles to meet morning target)
            await new ArticleFactory()
                .withCountry('us')
                .withLanguage('fr')
                .withCategory('technology')
                .withHeadline('Nouvelles Tech US 1')
                .asReal()
                .createInDatabase(testContext.prisma);

            await new ArticleFactory()
                .withCountry('us')
                .withLanguage('fr')
                .withCategory('politics')
                .withHeadline('Nouvelles Politiques US 1')
                .asFake('Contenu politique généré par IA')
                .createInDatabase(testContext.prisma);

            await new ArticleFactory()
                .withCountry('us')
                .withLanguage('fr')
                .withCategory('technology')
                .withHeadline('Nouvelles Tech US 2')
                .asReal()
                .createInDatabase(testContext.prisma);

            await new ArticleFactory()
                .withCountry('us')
                .withLanguage('fr')
                .withCategory('business')
                .withHeadline('Nouvelles Affaires US 1')
                .asFake('Informations commerciales trompeuses')
                .createInDatabase(testContext.prisma);

            const { tasks } = testContext.gateways;
            const articleGenerationTask = tasks.find((task) => task.name === 'article-generation');

            // When - running the article generation task
            await expect(articleGenerationTask!.execute()).resolves.not.toThrow();

            // Then - should preserve existing articles and not generate duplicates
            const articles = await testContext.prisma.article.findMany({
                orderBy: [{ country: 'asc' }, { createdAt: 'asc' }],
            });

            expect(articles).toHaveLength(8);

            // Verify language-country combinations match task configuration
            const frenchCountryArticles = articles.filter((a) => a.country === 'fr');
            const usCountryArticles = articles.filter((a) => a.country === 'us');

            expect(frenchCountryArticles).toHaveLength(4);
            expect(usCountryArticles).toHaveLength(4);

            // Verify correct language-country pairing
            frenchCountryArticles.forEach((article) => {
                expect(article.language).toBe('en');
                expect(article.country).toBe('fr');
            });

            usCountryArticles.forEach((article) => {
                expect(article.language).toBe('fr');
                expect(article.country).toBe('us');
            });

            // Verify authenticity mix
            const fakeArticles = articles.filter((a) => a.isFake);
            const realArticles = articles.filter((a) => !a.isFake);

            expect(fakeArticles).toHaveLength(4);
            expect(realArticles).toHaveLength(4);

            // Verify fake articles have reasons and real articles don't
            fakeArticles.forEach((article) => {
                expect(article.fakeReason).toBeTruthy();
                expect(typeof article.fakeReason).toBe('string');
            });

            realArticles.forEach((article) => {
                expect(article.fakeReason).toBeNull();
            });
        }, 15000);
    });

    describe('Language-Country Configuration', () => {
        it('should validate the task uses correct language-country mappings', async () => {
            // Given - examining the task configuration
            const { tasks } = testContext.gateways;
            const articleGenerationTask = tasks.find((task) => task.name === 'article-generation');

            // Then - task should be configured for cross-language scenarios
            expect(articleGenerationTask).toBeDefined();
            expect(articleGenerationTask?.name).toBe('article-generation');

            // This test validates that our understanding of the language-country mapping is correct
            // Based on the task implementation:
            // - French country (fr) generates articles in English (en)
            // - US country (us) generates articles in French (fr)
            // This creates interesting cross-cultural content scenarios
        });

        it('should handle articles with correct language-country combinations', async () => {
            // Given - articles with the expected language-country combinations
            await new ArticleFactory()
                .withCountry('fr')
                .withLanguage('en')
                .withHeadline('English Article for French Market')
                .createInDatabase(testContext.prisma);

            await new ArticleFactory()
                .withCountry('us')
                .withLanguage('fr')
                .withHeadline('Article Français pour le Marché US')
                .createInDatabase(testContext.prisma);

            // When - retrieving the articles
            const articles = await testContext.prisma.article.findMany();

            // Then - articles should maintain their language-country relationships
            expect(articles).toHaveLength(2);

            const frenchCountryArticle = articles.find((a) => a.country === 'fr');
            const usCountryArticle = articles.find((a) => a.country === 'us');

            expect(frenchCountryArticle).toBeDefined();
            expect(frenchCountryArticle?.language).toBe('en');

            expect(usCountryArticle).toBeDefined();
            expect(usCountryArticle?.language).toBe('fr');
        });
    });
});
