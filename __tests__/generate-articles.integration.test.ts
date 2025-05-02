import { container } from '../src/di/container.js';
import { createTZDateForCountry } from '../src/shared/date/timezone.js';

import { cleanDatabase } from './database/global.js';
import { worldNewsResolver } from './resolvers/api.worldnewsapi.com/top-news.resolver.js';
import { openRouterGenerateArticlesResolver } from './resolvers/openrouter.ai/open-router.resolver.js';
import {
    cleanupIntegrationTest,
    type IntegrationTestContext,
    setupIntegrationTest,
} from './setup/integration.js';
import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, vi } from 'vitest';
import MockDate from 'mockdate';

describe('Job - Generate Articles - Integration Tests', () => {
    let testContext: IntegrationTestContext;
    const EXPECTED_HOUR = 13;

    beforeAll(async () => {
        testContext = await setupIntegrationTest([
            worldNewsResolver,
            openRouterGenerateArticlesResolver,
        ]);
    });

    beforeEach(async () => {
        // Clean up articles before each test
        await cleanDatabase(testContext.prisma);

        // Set time to January 1st, 2020 at Paris time
        const mockDate = createTZDateForCountry(new Date(2020, 0, 1, EXPECTED_HOUR, 0, 0, 0), 'fr');
        MockDate.set(mockDate);
    });

    afterEach(async () => {
        await testContext.jobRunner.stop();
        MockDate.reset();
    });

    afterAll(async () => {
        vi.useRealTimers();
        await cleanupIntegrationTest(testContext);
    });

    it('should generate articles based on time of day rules', async () => {
        // Given
        const { prisma } = testContext;
        const jobs = container.get('Jobs');
        const articleGenerationJob = jobs.find((job) => job.name === 'article-generation');

        expect(articleGenerationJob).toBeDefined();
        expect(articleGenerationJob?.schedule).toBe('5 * * * *');
        expect(articleGenerationJob?.executeOnStartup).toBe(true);

        // When
        await articleGenerationJob!.execute();

        // Then: Verify the database state
        const articles = await prisma.article.findMany({
            orderBy: { createdAt: 'desc' },
        });

        expect(articles).toMatchObject([
            {
                article: expect.any(String),
                category: 'TECHNOLOGY',
                country: 'us',
                createdAt: expect.any(Date),
                fakeReason: null,
                headline: expect.stringMatching(
                    /Test Article Shows Promise in News Generation Research \d+/,
                ),
                id: expect.any(String),
                isFake: false,
                language: 'en',
                summary: expect.stringMatching(
                    /Test summary showcasing advances in AI-powered news generation\. \(Article \d+\)/,
                ),
            },
            {
                article: expect.any(String),
                category: 'TECHNOLOGY',
                country: 'us',
                createdAt: expect.any(Date),
                fakeReason: expect.stringContaining('While quantum computing research is ongoing'),
                headline: expect.stringMatching(
                    /Global Tech Leaders Announce Revolutionary Quantum Computing Breakthrough \d+/,
                ),
                id: expect.any(String),
                isFake: true,
                language: 'en',
                summary: expect.stringMatching(
                    /Major technology companies have achieved a significant breakthrough in quantum computing/,
                ),
            },
            {
                article: expect.any(String),
                category: 'TECHNOLOGY',
                country: 'us',
                createdAt: expect.any(Date),
                fakeReason: null,
                headline: expect.stringMatching(
                    /Test Article Shows Promise in News Generation Research \d+/,
                ),
                id: expect.any(String),
                isFake: false,
                language: 'en',
                summary: expect.stringMatching(
                    /Test summary showcasing advances in AI-powered news generation\. \(Article \d+\)/,
                ),
            },
            {
                article: expect.any(String),
                category: 'TECHNOLOGY',
                country: 'us',
                createdAt: expect.any(Date),
                fakeReason: expect.stringContaining('While quantum computing research is ongoing'),
                headline: expect.stringMatching(
                    /Global Tech Leaders Announce Revolutionary Quantum Computing Breakthrough \d+/,
                ),
                id: expect.any(String),
                isFake: true,
                language: 'en',
                summary: expect.stringMatching(
                    /Major technology companies have achieved a significant breakthrough in quantum computing/,
                ),
            },
            {
                article: expect.any(String),
                category: 'TECHNOLOGY',
                country: 'us',
                createdAt: expect.any(Date),
                fakeReason: null,
                headline: expect.stringMatching(
                    /Test Article Shows Promise in News Generation Research \d+/,
                ),
                id: expect.any(String),
                isFake: false,
                language: 'en',
                summary: expect.stringMatching(
                    /Test summary showcasing advances in AI-powered news generation\. \(Article \d+\)/,
                ),
            },
            {
                article: expect.any(String),
                category: 'TECHNOLOGY',
                country: 'us',
                createdAt: expect.any(Date),
                fakeReason: expect.stringContaining('While quantum computing research is ongoing'),
                headline: expect.stringMatching(
                    /Global Tech Leaders Announce Revolutionary Quantum Computing Breakthrough \d+/,
                ),
                id: expect.any(String),
                isFake: true,
                language: 'en',
                summary: expect.stringMatching(
                    /Major technology companies have achieved a significant breakthrough in quantum computing/,
                ),
            },
        ]);
    }, 20000);
});
