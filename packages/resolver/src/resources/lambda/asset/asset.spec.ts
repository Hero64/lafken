import { TerraformAsset } from 'cdktf';
import { build } from 'esbuild';
import { setupTestingStack } from '../../../utils';
import { lambdaAssets } from './asset';

jest.mock('esbuild', () => {
  return {
    build: jest.fn(),
  };
});

jest.mock('cdktf', () => {
  const actual = jest.requireActual('cdktf');

  return {
    ...actual,
    TerraformAsset: jest.fn().mockImplementation(() => ({
      id: 'testing',
    })),
  };
});

describe('Lambda Assets', () => {
  it('should initialize asset metadata', async () => {
    lambdaAssets.initializeMetadata('/tmp', 'handler', {
      className: 'Testing',
      methods: ['foo', 'bar'],
    });

    const prebuildPath = '/tmp/handler.js';
    const internalState = (lambdaAssets as any).lambdaAssets;

    expect(internalState[prebuildPath]).toEqual({
      metadata: {
        className: 'Testing',
        methods: ['foo', 'bar'],
      },
    });
  });

  it('should create terraform asset', async () => {
    const { stack } = setupTestingStack();
    await lambdaAssets.buildHandler(stack, {
      filename: 'handler',
      pathName: '/tmp/',
    });

    expect(build).toHaveBeenCalledTimes(1);
    expect(TerraformAsset).toHaveBeenCalledTimes(1);
  });
});
