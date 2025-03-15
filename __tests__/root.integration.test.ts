import { getHttpServer } from '../src/di/container.js';

import { cleanupIntegrationTest, setupIntegrationTest } from './setup.js';

describe('Root Route Integration Tests', () => {
    beforeAll(async () => {
        await setupIntegrationTest();
    });

    afterAll(async () => {
        await cleanupIntegrationTest();
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
