import { rmSync } from 'node:fs';

import { CACHE_DIR } from '../../src/infrastructure/outbound/data-sources/cached-news.adapter.js';

/**
 * Cleans the cache directory for a specific environment
 * If no environment is provided, cleans the test environment cache
 */
export function cleanCache(env: string = 'test'): void {
    try {
        const cacheDir = CACHE_DIR(env);
        rmSync(cacheDir, { force: true, recursive: true });
    } catch (error) {
        // Ignore errors if directory doesn't exist
        if ((error as { code?: string }).code !== 'ENOENT') {
            throw error;
        }
    }
}
