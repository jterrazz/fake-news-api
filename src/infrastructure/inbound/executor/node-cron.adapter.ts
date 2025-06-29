import { type LoggerPort } from '@jterrazz/logger';
import cron, { type ScheduledTask } from 'node-cron';

import {
    type ExecutorPort,
    type TaskPort,
} from '../../../application/ports/inbound/executor.port.js';

export class NodeCronAdapter implements ExecutorPort {
    private readonly logger: LoggerPort;
    private readonly scheduledTasks: ScheduledTask[] = [];
    private readonly tasks: TaskPort[];

    constructor(logger: LoggerPort, tasks: TaskPort[]) {
        this.logger = logger;
        this.tasks = tasks;
    }

    async initialize(): Promise<void> {
        this.logger.info(`Initializing ${this.tasks.length} tasks`);

        for (const task of this.tasks) {
            this.logger.info(`Scheduling task: ${task.name} with schedule: ${task.schedule}`);

            const cronTask = cron.schedule(task.schedule, async () => {
                this.logger.info(`Executing task: ${task.name}`);
                try {
                    await task.execute();
                    this.logger.info(`Task completed successfully: ${task.name}`);
                } catch (error) {
                    this.logger.error(`Task failed: ${task.name}`, { error });
                }
            });

            this.scheduledTasks.push(cronTask);

            if (task.executeOnStartup) {
                this.logger.info(`Executing task on startup: ${task.name}`);
                try {
                    await task.execute();
                    this.logger.info(`Startup task completed successfully: ${task.name}`);
                } catch (error) {
                    this.logger.error(`Startup task failed: ${task.name}`, { error });
                }
            }

            cronTask.start();
        }

        this.logger.info('All tasks initialized and started');
    }

    async stop(): Promise<void> {
        this.logger.info('Stopping all scheduled tasks');

        for (const task of this.scheduledTasks) {
            task.stop();
        }

        this.scheduledTasks.length = 0;
        this.logger.info('All tasks stopped');
    }
}
