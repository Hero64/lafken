import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    watch: false,
    setupFiles: ['./vitest.setup.mts'],
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
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
