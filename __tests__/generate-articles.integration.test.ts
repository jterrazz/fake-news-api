import { TZDate } from '@date-fns/tz';

import { getJobs } from '../src/di/container.js';
import { getTimezoneForCountry } from '../src/shared/date/timezone.js';

import { worldNewsResolver } from './resolvers/api.worldnewsapi.com/top-news.resolver.js';
import { mockGeminiGenerateContentHandler } from './resolvers/com.googleapis/gemini.resolver.js';
import {
    cleanupIntegrationTest,
    type IntegrationTestContext,
    setupIntegrationTest,
} from './support/integration.js';

describe('Job - Generate Articles - Integration Tests', () => {
    let testContext: IntegrationTestContext;
    const EXPECTED_HOUR = 13;
    const EXPECTED_ARTICLE_COUNT = 8;

    beforeAll(async () => {
        testContext = await setupIntegrationTest([
            worldNewsResolver,
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

        // Set time to January 1st, 2020 at Paris time
        const mockDate = new TZDate(
            2020,
            0,
            1,
            EXPECTED_HOUR,
            0,
            0,
            0,
            getTimezoneForCountry('us'),
        );
        jest.setSystemTime(mockDate);
    });

    afterEach(async () => {
        await testContext.jobRunner.stop();
    });

    afterAll(async () => {
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
            // expect(articleHour).toBe(EXPECTED_HOUR);
        });

        // Verify we have a mix of real and fake articles
        const fakeArticles = articles.filter((a) => a.isFake);
        const realArticles = articles.filter((a) => !a.isFake);

        expect(fakeArticles.length).toBeGreaterThan(0);
        expect(realArticles.length).toBeGreaterThan(0);
    });
});
