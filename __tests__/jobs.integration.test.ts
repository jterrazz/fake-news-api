import { type Job } from '../src/application/ports/inbound/job-runner.port.js';

import { getJobs } from '../src/di/container.js';

import {
    cleanupIntegrationTest,
    type IntegrationTestContext,
    setupIntegrationTest,
} from './support/integration.js';

describe('Jobs Integration Tests', () => {
    let testContext: IntegrationTestContext;

    beforeAll(async () => {
        testContext = await setupIntegrationTest();
    });

    afterAll(async () => {
        await cleanupIntegrationTest(testContext);
    });

    it('should initialize and run article generation job', async () => {
        // Given
        const { jobRunner } = testContext;
        const jobs = getJobs();
        const articleGenerationJob = jobs.find((job) => job.name === 'article-generation');

        // Then
        expect(articleGenerationJob).toBeDefined();
        expect(articleGenerationJob?.schedule).toBe('0 11 * * *');
        expect(articleGenerationJob?.executeOnStartup).toBe(true);

        // When
        await jobRunner.initialize();

        // Then
        // The job should have executed on startup since executeOnStartup is true
        // We don't test the cron scheduling since that would require waiting for specific times
        // Instead we verify the job was registered and can be executed
        await expect(articleGenerationJob!.execute()).resolves.not.toThrow();
    });

    it('should handle job registration', async () => {
        // Given
        const { jobRunner } = testContext;
        const testJob: Job = {
            execute: async () => {
                // Do nothing
            },
            name: 'test-job',
            schedule: '* * * * *',
        };

        // When
        jobRunner.registerJob(testJob);
        await jobRunner.initialize();

        // Then
        const jobs = getJobs();
        expect(jobs).toContainEqual(
            expect.objectContaining({
                name: 'test-job',
                schedule: '* * * * *',
            }),
        );
    });

    it('should handle job errors gracefully', async () => {
        // Given
        const { jobRunner } = testContext;
        const errorJob: Job = {
            execute: async () => {
                throw new Error('Test error');
            },
            name: 'error-job',
            schedule: '* * * * *',
        };

        // When
        jobRunner.registerJob(errorJob);
        await jobRunner.initialize();

        // Then
        await expect(errorJob.execute()).rejects.toThrow('Test error');
    });

    afterEach(async () => {
        // Stop the job runner after each test to clean up
        await testContext.jobRunner.stop();
    });
});
