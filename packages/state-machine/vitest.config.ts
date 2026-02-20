import path from 'node:path';
import swc from 'unplugin-swc';
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
