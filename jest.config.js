import { jestConfig } from '@jterrazz/package-typescript-test';

const baseConfig = await jestConfig();

export default {
    ...baseConfig,
    setupFilesAfterEnv: [
        ...(baseConfig.setupFilesAfterEnv || []),
        '<rootDir>/__tests__/support/jest.setup.ts',
    ],
};
