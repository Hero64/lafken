import path from 'node:path';
import { defineConfig } from 'vitest/config';
import { coverage } from '../../vitest.coverage.mts';

export default defineConfig({
  test: {
    watch: false,
    setupFiles: ['./vitest.setup.mts'],
    include: ['src/**/*.spec.ts'],
    coverage: {
      ...coverage,
      // A ratchet, not a target: these are the numbers this package
      // already reaches, minus 2 points of slack. Raise them when
      // coverage improves; never lower them to make a build pass.
      thresholds: {
        statements: 93,
        branches: 83,
        functions: 98,
        lines: 93,
      },
    },
  },
  resolve: {
    alias: [
      {
        find: /^@lafken\/(.*)$/,
        replacement: path.resolve(import.meta.dirname, '../$1/src'),
      },
    ],
  },
});
