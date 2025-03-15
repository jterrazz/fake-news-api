import { getHttpServer } from '../src/di/container.js';

import {
    cleanupIntegrationTest,
    type IntegrationTestContext,
    setupIntegrationTest,
} from './support/integration.js';

describe('Root Route Integration Tests', () => {
    let testContext: IntegrationTestContext;

    beforeAll(async () => {
        testContext = await setupIntegrationTest();
    });

    afterAll(async () => {
        await cleanupIntegrationTest(testContext);
    });

    it('should return OK status for the root route', async () => {
        // Given
        const app = getHttpServer();

        // When
        const response = await app.request('/');

        // Then
        expect(response.status).toBe(200);
        expect(await response.text()).toBe('OK');
    });
});
