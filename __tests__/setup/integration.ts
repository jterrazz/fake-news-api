import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import { unlinkSync } from 'fs';
import type { RequestHandler } from 'msw';
import { setupServer, type SetupServerApi } from 'msw/node';
import os from 'os';
import { resolve } from 'path';

import { type HttpServerPort } from '../../src/application/ports/inbound/http-server.port.js';
import {
    type Job,
    type JobRunnerPort,
} from '../../src/application/ports/inbound/job-runner.port.js';

import { createContainer } from '../../src/di/container.js';

export type IntegrationTestContext = {
    databasePath: string;
    httpServer: HttpServerPort;
    jobRunner: JobRunnerPort;
    jobs: Job[];
    msw: SetupServerApi;
    prisma: PrismaClient;
};

/**
 * Cleanup function to be called after tests
 * @param context - The integration test context
 */
export async function cleanupIntegrationTest(context: IntegrationTestContext): Promise<void> {
    await context.jobRunner.stop();
    await context.httpServer.stop();
    await context.prisma.$disconnect();
    context.msw.close();

    // Remove the SQLite file
    try {
        unlinkSync(context.databasePath);
    } catch (err) {
        console.error('Error deleting SQLite file', err);
    }
}

/**
 * Setup function to be called before tests
 * @param handlers - The request handlers to be used in the tests
 * @returns The integration test context
 */
export async function setupIntegrationTest(
    handlers: RequestHandler[] = [],
): Promise<IntegrationTestContext> {
    // Generate a unique SQLite file path in the system temp directory
    const databaseFile = `test-${randomUUID()}.sqlite`;
    const databasePath = resolve(os.tmpdir(), databaseFile);
    const databaseUrl = `file:${databasePath}`;

    const container = createContainer({ databaseUrl });
    const level = container.get('Configuration').getAppConfiguration().logging.level;

    // Run migrations on the new database file
    execSync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: databaseUrl },
        stdio: level === 'silent' ? 'ignore' : 'inherit',
    });

    const httpServer = container.get('HttpServer');
    const jobRunner = container.get('JobRunner');
    const jobs = container.get('Jobs');
    const msw = setupServer(...handlers);
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: databaseUrl,
            },
        },
    });

    msw.listen({ onUnhandledRequest: 'warn' });

    // TODO Expose as gateway, __internal
    return { databasePath, httpServer, jobRunner, jobs, msw, prisma };
}
