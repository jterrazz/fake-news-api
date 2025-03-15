import type { RequestHandler } from 'msw';
import { setupServer } from 'msw/node';

export type IntegrationTestContext = {
    server: ReturnType<typeof setupServer>;
};

const createTestServer = (handlers: RequestHandler[] = []) => {
    const server = setupServer(...handlers);
    return server;
};

// Setup function to be called before tests
export async function setupIntegrationTest(
    handlers: RequestHandler[] = [],
): Promise<IntegrationTestContext> {
    const server = createTestServer(handlers);
    server.listen({ onUnhandledRequest: 'error' });

    return { server };
}

// Cleanup function to be called after tests
export async function cleanupIntegrationTest(context: IntegrationTestContext): Promise<void> {
    context.server.close();
}
