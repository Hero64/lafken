import type { ViteUserConfig } from 'vitest/config';

type CoverageOptions = NonNullable<NonNullable<ViteUserConfig['test']>['coverage']>;

/**
 * Coverage settings shared by every published package.
 *
 * Each package measures itself: turbo runs `test:coverage` per package and
 * every one writes its own `coverage/` directory, with its own thresholds in
 * its `vitest.config.mts`. `scripts/coverage-report.js` folds the twelve
 * summaries into one table when a repo-wide number is wanted.
 *
 * `apps/example` is deliberately left out — it exercises the framework as a
 * user would, so its coverage says nothing about the framework's own tests.
 */
export const coverage: CoverageOptions = {
  provider: 'v8',
  include: ['src/**/*.ts'],
  exclude: [
    'src/**/*.spec.ts',
    'src/**/*.d.ts',
    // Type-only modules compile to nothing, so they would otherwise report
    // as 0% covered and drag every threshold down.
    'src/**/*.types.ts',
    'src/**/index.ts',
  ],
  reporter: ['text-summary', 'html', 'json-summary'],
  reportsDirectory: './coverage',
};
