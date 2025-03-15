import type { RequestHandler } from 'msw';
import { setupServer } from 'msw/node';

import { type HttpServerPort } from '../../src/application/ports/inbound/http-server.port.js';
import { type JobRunnerPort } from '../../src/application/ports/inbound/job-runner.port.js';

import { getHttpServer, getJobRunner } from '../../src/di/container.js';

export type IntegrationTestContext = {
    mswServer: ReturnType<typeof setupServer>;
    jobRunner: JobRunnerPort;
    httpServer: HttpServerPort;
};

const createMswServer = (handlers: RequestHandler[] = []) => {
    const server = setupServer(...handlers);
    return server;
};

// Setup function to be called before tests
export async function setupIntegrationTest(
    handlers: RequestHandler[] = [],
): Promise<IntegrationTestContext> {
    const mswServer = createMswServer(handlers);
    mswServer.listen({ onUnhandledRequest: 'error' });

    const jobRunner = getJobRunner();
    const httpServer = getHttpServer();

    return { httpServer, jobRunner, mswServer };
}

// Cleanup function to be called after tests
export async function cleanupIntegrationTest(context: IntegrationTestContext): Promise<void> {
    await context.jobRunner.stop();
    await context.httpServer.stop();
    context.mswServer.close();
}
