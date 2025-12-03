import { LambdaFunction } from '@cdktf/provider-aws/lib/lambda-function';
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
  it('should initialize asset metadata', () => {
    lambdaAssets.initializeMetadata({
      foldername: '/tmp',
      filename: 'handler',
      className: 'Testing',
      methods: ['foo', 'bar'],
      minify: false,
    });

    const prebuildPath = '/tmp/handler.js';
    const internalState = (lambdaAssets as any).lambdaAssets;

    expect(internalState[prebuildPath]).toEqual({
      lambdas: [],
      metadata: {
        filename: 'handler',
        foldername: '/tmp',
        minify: false,
      },
      resources: {
        Testing: {
          className: 'Testing',
          methods: ['foo', 'bar'],
        },
      },
    });
  });

  it('should create terraform asset', async () => {
    const { stack } = setupTestingStack();
    lambdaAssets.initializeMetadata({
      foldername: '/tmp',
      filename: 'handler',
      className: 'Testing',
      methods: ['foo', 'bar'],
      minify: false,
    });

    const lambda = new LambdaFunction(stack, 'test-handler', {
      functionName: 'index.test',
      role: '',
    });

    lambdaAssets.addLambda({
      filename: 'handler',
      foldername: '/tmp',
      scope: stack,
      lambda,
    });
    await lambdaAssets.createAssets();

    expect(build).toHaveBeenCalledTimes(1);
    expect(TerraformAsset).toHaveBeenCalledTimes(1);
  });
});
