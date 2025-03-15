import { cleanCache } from './cache.js';

// Clean cache before any tests run
beforeAll(() => {
    cleanCache();
});

// Clean cache before each test suite
beforeEach(() => {
    cleanCache();
});
