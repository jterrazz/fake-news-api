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
    _internal: { databasePath: string };
    gateways: {
        httpServer: HttpServerPort;
        jobRunner: JobRunnerPort;
        jobs: Job[];
    };
    msw: SetupServerApi;
    prisma: PrismaClient;
};

export async function cleanupIntegrationTest(context: IntegrationTestContext): Promise<void> {
    await context.gateways.jobRunner.stop();
    await context.gateways.httpServer.stop();
    await context.prisma.$disconnect();
    context.msw.close();
    try {
        unlinkSync(context._internal.databasePath);
    } catch (err) {
        console.debug('Could not delete SQLite file:', err);
    }
}

export async function setupIntegrationTest(
    handlers: RequestHandler[] = [],
): Promise<IntegrationTestContext> {
    const databaseFile = `test-${randomUUID()}.sqlite`;
    const databasePath = resolve(os.tmpdir(), databaseFile);
    const databaseUrl = `file:${databasePath}`;
    const container = createContainer({ databaseUrl });
    const { level } = container.get('Configuration').getInboundConfiguration().logger;

    execSync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: databaseUrl },
        stdio: level === 'silent' ? 'ignore' : 'inherit',
    });

    const httpServer = container.get('HttpServer');
    const jobRunner = container.get('JobRunner');
    const jobs = container.get('Jobs');
    const msw = setupServer(...handlers);
    const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

    msw.listen({ onUnhandledRequest: 'warn' });

    return {
        _internal: { databasePath },
        gateways: { httpServer, jobRunner, jobs },
        msw,
        prisma,
    };
}
