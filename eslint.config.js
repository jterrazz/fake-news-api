import { jestEslint } from '@jterrazz/test';
import { eslintNodeConfig } from '@jterrazz/quality';

export default [...eslintNodeConfig, ...jestEslint];
