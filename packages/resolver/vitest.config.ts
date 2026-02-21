import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    watch: false,
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: [
      {
        find: /^@lafken\/(.*)$/,
        replacement: path.resolve(__dirname, '../$1/src'),
      },
    ],
  },
});
