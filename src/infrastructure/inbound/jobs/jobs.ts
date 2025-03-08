import { Job } from '../../../application/ports/inbound/job-runner.port.js';

// Article jobs
import { articleGenerationJob } from './articles/article-generation.job.js';

/**
 * Register all application jobs
 * Jobs are organized by domain/feature in subdirectories:
 * - /articles - Article-related jobs (generation, cleanup, etc.)
 * - /system - System maintenance jobs (if any)
 * - /analytics - Analytics and reporting jobs (if any)
 */
export const createJobs = (): Job[] => {
    return [
        // Article jobs
        articleGenerationJob,

        // System jobs
        // ... add system jobs here

        // Analytics jobs
        // ... add analytics jobs here
    ];
};
