import { getJobs } from '../src/di/container.js';

import { mockGeminiGenerateContentHandler } from './handlers/com.googleapis/gemini.handler.js';
import { mockWorldNewsTopArticlesHandler } from './handlers/com.worldnewsapi/articles.handler.js';
import {
    cleanupIntegrationTest,
    type IntegrationTestContext,
    setupIntegrationTest,
} from './support/integration.js';

describe('Job Article Generation Integration Tests', () => {
    let testContext: IntegrationTestContext;
    const originalTZ = process.env.TZ;
    const EXPECTED_HOUR = 14;
    const EXPECTED_ARTICLE_COUNT = 2; // Between 12:00 and 17:00 we generate 8 articles

    beforeAll(async () => {
        // Set timezone to Paris for consistent testing
        process.env.TZ = 'Europe/Paris';

        testContext = await setupIntegrationTest([
            mockWorldNewsTopArticlesHandler,
            mockGeminiGenerateContentHandler,
        ]);

        // Use modern fake timers that allow async operations to work
        jest.useFakeTimers({
            doNotFake: ['setTimeout', 'setInterval', 'setImmediate', 'nextTick'],
        });
    });

    beforeEach(async () => {
        // Clean up articles before each test
        await testContext.prisma.article.deleteMany();

        // Set time to January 1st, 2020 at 13:00 Paris time
        const mockDate = new Date(2020, 0, 1, EXPECTED_HOUR, 0, 0, 0);
        jest.setSystemTime(mockDate);
    });

    afterEach(async () => {
        await testContext.jobRunner.stop();
    });

    afterAll(async () => {
        // Restore original timezone and timers
        process.env.TZ = originalTZ;
        jest.useRealTimers();
        await cleanupIntegrationTest(testContext);
    });

    it('should generate articles based on time of day rules', async () => {
        // Given
        const { prisma } = testContext;
        const jobs = getJobs();
        const articleGenerationJob = jobs.find((job) => job.name === 'article-generation');

        expect(articleGenerationJob).toBeDefined();
        expect(articleGenerationJob?.schedule).toBe('5 * * * *');
        expect(articleGenerationJob?.executeOnStartup).toBe(true);

        // When
        await articleGenerationJob!.execute();

        // Then verify the database state
        const articles = await prisma.article.findMany({
            orderBy: { createdAt: 'desc' },
        });

        console.log(`Found ${articles.length} articles at ${EXPECTED_HOUR}:00`);
        console.log('Current date in test:', new Date().toISOString());

        // Verify article count based on time rules
        expect(articles).toHaveLength(EXPECTED_ARTICLE_COUNT);

        // Verify article properties
        articles.forEach((article) => {
            expect(article).toMatchObject({
                category: expect.stringMatching(/^(TECHNOLOGY|POLITICS)$/),
                createdAt: expect.any(Date),
                headline: expect.any(String),
                isFake: expect.any(Boolean),
            });

            // Verify creation time is at the expected hour
            // const articleHour = article.createdAt.getHours();
            // console.log(`Article created at hour: ${articleHour}`);
            // expect(articleHour).toBe(EXPECTED_HOUR);
        });

        // Verify we have a mix of real and fake articles
        const fakeArticles = articles.filter((a) => a.isFake);
        const realArticles = articles.filter((a) => !a.isFake);

        console.log(
            `Found ${fakeArticles.length} fake articles and ${realArticles.length} real articles`,
        );
        expect(fakeArticles.length).toBeGreaterThan(0);
        expect(realArticles.length).toBeGreaterThan(0);
    });
});
