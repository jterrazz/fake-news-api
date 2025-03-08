import cron from 'node-cron';

import { Job, JobRunnerPort } from '../../../application/ports/inbound/job-runner.port.js';

import { createJobs } from './jobs.js';

export class NodeCronAdapter implements JobRunnerPort {
    private jobs: Job[] = [];
    private tasks: cron.ScheduledTask[] = [];

    constructor() {
        // Register jobs on construction, similar to HTTP routes
        this.jobs = createJobs();
    }

    public registerJob(job: Job): void {
        this.jobs.push(job);
    }

    public async initialize(): Promise<void> {
        try {
            console.log('Initializing job runner');

            for (const job of this.jobs) {
                // Execute immediately on startup if it's the article generation job
                if (job.name === 'article-generation') {
                    await job.execute();
                }

                // Schedule the job
                const task = cron.schedule(job.schedule, () => {
                    job.execute().catch((error) => {
                        console.error(`Failed to execute job ${job.name}:`, error);
                    });
                });

                this.tasks.push(task);
                console.log(`Job ${job.name} scheduled with cron expression: ${job.schedule}`);
            }
        } catch (error) {
            console.error('Failed to initialize job runner:', error);
            throw error;
        }
    }

    public async stop(): Promise<void> {
        for (const task of this.tasks) {
            task.stop();
        }
        this.tasks = [];
    }
}
