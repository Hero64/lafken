import path from 'node:path';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';
import { coverage } from '../../vitest.coverage.mts';

export default defineConfig({
  oxc: false,
  test: {
    watch: false,
    setupFiles: ['./vitest.setup.mts'],
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    coverage: {
      ...coverage,
      thresholds: {
        statements: 94,
        branches: 89,
        functions: 98,
        lines: 94,
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
  plugins: [
    swc.vite({
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        transform: {
          decoratorMetadata: true,
        },
      },
    }),
  ],
});
