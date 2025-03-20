import cron from 'node-cron';

import {
    type Job,
    type JobRunnerPort,
} from '../../../application/ports/inbound/job-runner.port.js';
import { type LoggerPort } from '../../../application/ports/outbound/logging/logger.port.js';

export class NodeCronAdapter implements JobRunnerPort {
    private tasks: cron.ScheduledTask[] = [];

    constructor(
        private readonly logger: LoggerPort,
        private readonly jobs: Job[],
    ) {}

    public registerJob(job: Job): void {
        this.jobs.push(job);
    }

    public async initialize(): Promise<void> {
        try {
            this.logger.info('Initializing job runner');

            for (const job of this.jobs) {
                // Execute immediately if configured to run on startup
                // Run in background to not block initialization
                if (job.executeOnStartup) {
                    job.execute().catch((error) => {
                        this.logger.error('Failed to execute startup job', {
                            error,
                            job: job.name,
                        });
                    });
                }

                // Schedule the job
                const task = cron.schedule(job.schedule, () => {
                    job.execute().catch((error) => {
                        this.logger.error('Failed to execute job', {
                            error,
                            job: job.name,
                        });
                    });
                });

                this.tasks.push(task);
                this.logger.info('Job scheduled', {
                    job: job.name,
                    schedule: job.schedule,
                });
            }
        } catch (error) {
            this.logger.error('Failed to initialize job runner', { error });
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
