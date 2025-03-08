/**
 * Represents a job that can be scheduled and executed
 */
export interface Job {
    name: string;
    schedule: string; // Cron expression
    execute: () => Promise<void>;
}

/**
 * JobRunner port - defines how background jobs can be scheduled and managed
 * This is an inbound port because scheduled jobs drive application behavior
 */
export interface JobRunnerPort {
    /**
     * Initialize the job runner and start all registered jobs
     */
    initialize(): Promise<void>;

    /**
     * Register a new job with the runner
     */
    registerJob(job: Job): void;

    /**
     * Stop all scheduled jobs
     */
    stop(): Promise<void>;
}
