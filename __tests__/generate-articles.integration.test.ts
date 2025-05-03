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

import { cleanDatabase } from './database/global.js';
import { worldNewsResolver } from './resolvers/api.worldnewsapi.com/top-news.resolver.js';
import { openRouterGenerateArticlesResolver } from './resolvers/openrouter.ai/open-router.resolver.js';
import {
    cleanupIntegrationTest,
    type IntegrationTestContext,
    setupIntegrationTest,
} from './setup/integration.js';

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
        const mockDate = createTZDateAtCountry(new Date(2020, 0, 1, EXPECTED_HOUR, 0, 0, 0), 'fr');
        mockOfDate.set(mockDate);
    });

    afterEach(async () => {
        await testContext.jobRunner.stop();
        mockOfDate.reset();
    });

    afterAll(async () => {
        await cleanupIntegrationTest(testContext);
    });

    it('should generate articles based on time of day rules', async () => {
        // Given
        const { jobs, prisma } = testContext;
        const articleGenerationJob = jobs.find((job) => job.name === 'article-generation');

        expect(articleGenerationJob).toBeDefined();
        expect(articleGenerationJob?.schedule).toBe('5 * * * *');
        expect(articleGenerationJob?.executeOnStartup).toBe(true);

        // When
        await articleGenerationJob!.execute();

        // Then: Verify the database state
        const articles = await prisma.article.findMany({
            orderBy: [{ headline: 'asc' }],
        });

        expect(articles).toMatchObject([
            {
                article:
                    'A consortium of leading tech companies unveiled a groundbreaking advancement in quantum computing technology, achieving unprecedented qubit stability at room temperature. The development promises to accelerate the commercialization of quantum computers.',
                category: 'TECHNOLOGY',
                country: 'us',
                createdAt: expect.any(Date),
                fakeReason:
                    'While quantum computing research is ongoing, room temperature qubit stability remains a significant challenge. This article fabricates a breakthrough that has not occurred.',
                headline:
                    'Global Tech Leaders Announce Revolutionary Quantum Computing Breakthrough 1',
                id: expect.any(String),
                isFake: true,
                language: 'en',
                summary:
                    'Major technology companies have achieved a significant breakthrough in quantum computing, demonstrating stable qubit operations at room temperature. (Article 1)',
            },
            {
                article:
                    'A consortium of leading tech companies unveiled a groundbreaking advancement in quantum computing technology, achieving unprecedented qubit stability at room temperature. The development promises to accelerate the commercialization of quantum computers.',
                category: 'TECHNOLOGY',
                country: 'us',
                createdAt: expect.any(Date),
                fakeReason:
                    'While quantum computing research is ongoing, room temperature qubit stability remains a significant challenge. This article fabricates a breakthrough that has not occurred.',
                headline:
                    'Global Tech Leaders Announce Revolutionary Quantum Computing Breakthrough 3',
                id: expect.any(String),
                isFake: true,
                language: 'en',
                summary:
                    'Major technology companies have achieved a significant breakthrough in quantum computing, demonstrating stable qubit operations at room temperature. (Article 3)',
            },
            {
                article:
                    'A consortium of leading tech companies unveiled a groundbreaking advancement in quantum computing technology, achieving unprecedented qubit stability at room temperature. The development promises to accelerate the commercialization of quantum computers.',
                category: 'TECHNOLOGY',
                country: 'us',
                createdAt: expect.any(Date),
                fakeReason:
                    'While quantum computing research is ongoing, room temperature qubit stability remains a significant challenge. This article fabricates a breakthrough that has not occurred.',
                headline:
                    'Global Tech Leaders Announce Revolutionary Quantum Computing Breakthrough 5',
                id: expect.any(String),
                isFake: true,
                language: 'en',
                summary:
                    'Major technology companies have achieved a significant breakthrough in quantum computing, demonstrating stable qubit operations at room temperature. (Article 5)',
            },
            {
                article:
                    'Recent developments in automated content generation demonstrate significant progress in creating factual news articles. Researchers emphasize the importance of maintaining journalistic standards in AI-generated content.',
                category: 'TECHNOLOGY',
                country: 'us',
                createdAt: expect.any(Date),
                fakeReason: null,
                headline: 'Test Article Shows Promise in News Generation Research 2',
                id: expect.any(String),
                isFake: false,
                language: 'en',
                summary:
                    'Test summary showcasing advances in AI-powered news generation. (Article 2)',
            },
            {
                article:
                    'Recent developments in automated content generation demonstrate significant progress in creating factual news articles. Researchers emphasize the importance of maintaining journalistic standards in AI-generated content.',
                category: 'TECHNOLOGY',
                country: 'us',
                createdAt: expect.any(Date),
                fakeReason: null,
                headline: 'Test Article Shows Promise in News Generation Research 4',
                id: expect.any(String),
                isFake: false,
                language: 'en',
                summary:
                    'Test summary showcasing advances in AI-powered news generation. (Article 4)',
            },
            {
                article:
                    'Recent developments in automated content generation demonstrate significant progress in creating factual news articles. Researchers emphasize the importance of maintaining journalistic standards in AI-generated content.',
                category: 'TECHNOLOGY',
                country: 'us',
                createdAt: expect.any(Date),
                fakeReason: null,
                headline: 'Test Article Shows Promise in News Generation Research 6',
                id: expect.any(String),
                isFake: false,
                language: 'en',
                summary:
                    'Test summary showcasing advances in AI-powered news generation. (Article 6)',
            },
        ]);
    }, 20000);
});
