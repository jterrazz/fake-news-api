import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import type { RequestHandler } from 'msw';
import { setupServer, type SetupServerApi } from 'msw/node';
import { dirname, resolve } from 'path';

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
    } catch (_err) {
        // File might already be deleted, ignore error
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
    // Generate a unique SQLite file path
    const databaseFile = `test-${randomUUID()}.sqlite`;
    const databasePath = resolve(__dirname, '../../tmp', databaseFile);
    const databaseUrl = `file:${databasePath}`;

    // TODO Move to configuration
    process.env.DATABASE_URL = databaseUrl;
    // TODO Move to real tmp directory
    const tmpDir = dirname(databasePath);
    if (!existsSync(tmpDir)) {
        mkdirSync(tmpDir, { recursive: true });
    }

    // Run migrations on the new database file
    execSync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: databaseUrl },
        stdio: 'inherit', // or 'ignore' if you want silence
    });

    const container = createContainer();
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
