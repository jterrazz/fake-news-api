import { createHttpServer } from '../src/application/http/index.js';

describe('Root Route Integration Tests', () => {
    const app = createHttpServer();

    it('should return OK status for the root route', async () => {
        const response = await app.request('/');
        expect(response.status).toBe(200);
        expect(await response.text()).toBe('OK');
    });
});
