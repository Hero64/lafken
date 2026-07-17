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
          methods: [{ name: 'foo' }, { name: 'bar' }],
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

  it('wraps streaming handlers with awslambda.streamifyResponse', async () => {
    const inputFile = path.join(tempDir, 'input.js');

    const plugin = LafkenBuildPlugin({
      filename: inputFile,
      exports: [
        {
          className: 'Testing',
          methods: [{ name: 'stream', streaming: true }, { name: 'plain' }],
        },
      ],
      removeAttributes: [],
    });

    const response = plugin.transform('class Testing {}', inputFile);

    expect(response?.code).toContain(
      'exports.stream_Testing = awslambda.streamifyResponse(TestingInstance.stream.bind(TestingInstance));'
    );
    expect(response?.code).toContain(
      'exports.plain_Testing = TestingInstance.plain.bind(TestingInstance);'
    );
  });
});
