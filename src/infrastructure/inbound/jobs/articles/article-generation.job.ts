import { Job } from '../../../application/ports/inbound/job-runner.port.js';

import { generateDailyArticles } from './article-generation.js';

export const articleGenerationJob: Job = {
    // Run at 11 AM daily
    execute: generateDailyArticles,

    name: 'article-generation',
    schedule: '0 11 * * *',
};
