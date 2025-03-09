import { jestEslint } from '@jterrazz/package-typescript-test';
import { eslintNodeConfig } from '@jterrazz/quality';

export default [...eslintNodeConfig, ...jestEslint];
