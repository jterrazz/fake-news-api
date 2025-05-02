import { PrismaClient } from '@prisma/client';
import type { RequestHandler } from 'msw';
import { setupServer, type SetupServerApi } from 'msw/node';

import { type HttpServerPort } from '../../src/application/ports/inbound/http-server.port.js';
import { type JobRunnerPort } from '../../src/application/ports/inbound/job-runner.port.js';

import { container } from '../../src/di/container.js';

export type IntegrationTestContext = {
    httpServer: HttpServerPort;
    jobRunner: JobRunnerPort;
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
}

/**
 * Setup function to be called before tests
 * @param handlers - The request handlers to be used in the tests
 * @returns The integration test context
 */
export async function setupIntegrationTest(
    handlers: RequestHandler[] = [],
): Promise<IntegrationTestContext> {
    const httpServer = container.get('HttpServer');
    const jobRunner = container.get('JobRunner');
    const msw = setupServer(...handlers);
    const prisma = new PrismaClient();

    msw.listen({ onUnhandledRequest: 'warn' });

    return { httpServer, jobRunner, msw, prisma };
}
