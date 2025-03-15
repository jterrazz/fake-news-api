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

    beforeAll(async () => {
        testContext = await setupIntegrationTest([
            mockWorldNewsTopArticlesHandler,
            mockGeminiGenerateContentHandler,
        ]);
    });

    afterAll(async () => {
        await cleanupIntegrationTest(testContext);
    });

    afterEach(async () => {
        await testContext.jobRunner.stop();
    });

    it('should initialize and run article generation job', async () => {
        // Given
        const { jobRunner, prisma } = testContext;
        const jobs = getJobs();
        const articleGenerationJob = jobs.find((job) => job.name === 'article-generation');

        // Then
        expect(articleGenerationJob).toBeDefined();
        expect(articleGenerationJob?.schedule).toBe('0 11 * * *');
        expect(articleGenerationJob?.executeOnStartup).toBe(true);

        // When
        await jobRunner.initialize();
        await articleGenerationJob!.execute();

        // Then
        // Verify that articles were created in the database
        const articles = await prisma.article.findMany({
            orderBy: { createdAt: 'desc' },
            take: 2, // We expect 2 articles from our mock handler
        });

        expect(articles).toHaveLength(2);
        expect(articles).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    category: 'TECHNOLOGY',
                    fakeReason: expect.stringContaining('room temperature qubit stability'),
                    headline:
                        'Global Tech Leaders Announce Revolutionary Quantum Computing Breakthrough',
                    isFake: true,
                }),
                expect.objectContaining({
                    category: 'TECHNOLOGY',
                    fakeReason: null,
                    headline: 'Test Article Shows Promise in News Generation Research',
                    isFake: false,
                }),
            ]),
        );
    });
});
