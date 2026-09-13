import path from 'node:path';
import { defineConfig } from 'vitest/config';
import { coverage } from '../../vitest.coverage.mts';

export default defineConfig({
  test: {
    watch: false,
    setupFiles: ['./vitest.setup.mts'],
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    coverage: {
      ...coverage,
      thresholds: {
        statements: 78,
        branches: 70,
        functions: 76,
        lines: 78,
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
