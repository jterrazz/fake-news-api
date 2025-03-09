/**
 * Represents a job that can be scheduled and executed
 */
export interface Job {
    /**
     * Unique name of the job
     */
    name: string;

    /**
     * Cron expression defining when the job should run
     */
    schedule: string;

    /**
     * Whether the job should be executed immediately on startup
     * @default false
     */
    executeOnStartup?: boolean;

    /**
     * The function to execute when the job runs
     */
    execute: () => Promise<void>;
}

/**
 * JobRunner port - defines how background jobs can be scheduled and managed
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
