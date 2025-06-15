import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import { unlinkSync } from 'fs';
import type { RequestHandler } from 'msw';
import { setupServer, type SetupServerApi } from 'msw/node';
import os from 'os';
import { resolve } from 'path';

import {
    type ExecutorPort,
    type TaskPort,
} from '../../src/application/ports/inbound/executor.port.js';
import { type ServerPort } from '../../src/application/ports/inbound/server.port.js';

import { createContainer } from '../../src/di/container.js';

export type IntegrationTestContext = {
    _internal: { databasePath: string };
    gateways: {
        executor: ExecutorPort;
        httpServer: ServerPort;
        tasks: TaskPort[];
    };
    msw: SetupServerApi;
    prisma: PrismaClient;
};

export async function cleanupIntegrationTest(context: IntegrationTestContext): Promise<void> {
    await context.gateways.executor.stop();
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
    const testContainer = createContainer({ databaseUrl });
    const { level } = testContainer.get('Configuration').getInboundConfiguration().logger;

    execSync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: databaseUrl },
        stdio: level === 'silent' ? 'ignore' : 'inherit',
    });

    const server = testContainer.get('Server');
    const executor = testContainer.get('Executor');
    const tasks = testContainer.get('Tasks');
    const msw = setupServer(...handlers);
    const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

    msw.listen({ onUnhandledRequest: 'warn' });

    return {
        _internal: { databasePath },
        gateways: { executor: executor, httpServer: server, tasks: tasks },
        msw,
        prisma,
    };
}

export const createTestServer = (): ServerPort => {
    return {
        request: async () => new Response(),
        start: async () => {},
        stop: async () => {},
    };
};
