import fs from 'node:fs/promises';
import path from 'node:path';
import esbuild from 'esbuild';
import { AlicantoBuildPlugin } from './build-plugin';

describe('AlicantoBuildPlugin', () => {
  const tempDir: string = path.join(__dirname, 'temp');

  beforeEach(async () => {
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('should export lambda functions', async () => {
    const inputFile = path.join(tempDir, 'input.js');
    const outputFile = path.join(tempDir, 'output.js');
    await fs.writeFile(inputFile, 'class Testing {}');

    await esbuild.build({
      entryPoints: [inputFile],
      bundle: true,
      outfile: outputFile,
      plugins: [
        AlicantoBuildPlugin({
          filename: 'input',
          export: {
            className: 'Testing',
            methods: ['foo', 'bar'],
          },
          removeAttributes: [],
        }),
      ],
    });

    const outputContent = await fs.readFile(outputFile, 'utf-8');
    expect(outputContent).toContain('var TestingInstance = new Testing();');
    expect(outputContent).toContain(
      'exports.foo = TestingInstance.foo.bind(TestingInstance);'
    );
    expect(outputContent).toContain(
      'exports.bar = TestingInstance.bar.bind(TestingInstance);'
    );
  });
});
