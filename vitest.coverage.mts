import type { ViteUserConfig } from 'vitest/config';

type CoverageOptions = NonNullable<NonNullable<ViteUserConfig['test']>['coverage']>;

export const coverage: CoverageOptions = {
  provider: 'v8',
  include: ['src/**/*.ts'],
  exclude: ['src/**/*.spec.ts', 'src/**/*.d.ts', 'src/**/*.types.ts', 'src/**/index.ts'],
  reporter: ['text-summary', 'html', 'json-summary'],
  reportsDirectory: './coverage',
};
