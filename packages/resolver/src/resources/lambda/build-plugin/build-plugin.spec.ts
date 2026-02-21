import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LafkenBuildPlugin } from './build-plugin';

describe('LafkenBuildPlugin', () => {
  const tempDir: string = path.join(__dirname, 'temp');

  it('should export lambda functions', async () => {
    const inputFile = path.join(tempDir, 'input.js');

    const plugin = LafkenBuildPlugin({
      filename: inputFile,
      exports: [
        {
          className: 'Testing',
          methods: ['foo', 'bar'],
        },
      ],
      removeAttributes: [],
    });

    const response = plugin.transform('class Testing {}', inputFile);

    expect(response?.code).toContain('const TestingInstance = new Testing()');
    expect(response?.code).toContain(
      'exports.foo_Testing = TestingInstance.foo.bind(TestingInstance);'
    );
    expect(response?.code).toContain(
      'exports.bar_Testing = TestingInstance.bar.bind(TestingInstance);'
    );
  });
});
