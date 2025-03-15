import { PrismaClient } from '@prisma/client';
import type { RequestHandler } from 'msw';
import { setupServer } from 'msw/node';

import { type HttpServerPort } from '../../src/application/ports/inbound/http-server.port.js';
import { type JobRunnerPort } from '../../src/application/ports/inbound/job-runner.port.js';

import { getHttpServer, getJobRunner } from '../../src/di/container.js';

import { cleanCache } from './cache.js';

export type IntegrationTestContext = {
    httpServer: HttpServerPort;
    jobRunner: JobRunnerPort;
    msw: ReturnType<typeof setupServer>;
    prisma: PrismaClient;
};

const createMsw = (handlers: RequestHandler[] = []) => {
    const server = setupServer(...handlers);
    return server;
};

// Setup function to be called before tests
export async function setupIntegrationTest(
    handlers: RequestHandler[] = [],
): Promise<IntegrationTestContext> {
    // Clean cache before each integration test
    cleanCache();

    const httpServer = getHttpServer();
    const jobRunner = getJobRunner();
    const msw = createMsw(handlers);
    const prisma = new PrismaClient();

    msw.listen({ onUnhandledRequest: 'warn' });

    return { httpServer, jobRunner, msw, prisma };
}

// Cleanup function to be called after tests
export async function cleanupIntegrationTest(context: IntegrationTestContext): Promise<void> {
    await context.jobRunner.stop();
    await context.httpServer.stop();
    await context.prisma.$disconnect();
    context.msw.close();

    // Clean cache after each integration test
    cleanCache();
}
