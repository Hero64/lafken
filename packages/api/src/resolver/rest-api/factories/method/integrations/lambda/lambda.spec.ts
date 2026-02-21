import { ApiGatewayIntegration } from '@cdktn/provider-aws/lib/api-gateway-integration';
import { enableBuildEnvVariable } from '@lafken/common';
import { LambdaHandler } from '@lafken/resolver';
import { Testing } from 'cdktn';
import { describe, expect, it, vi } from 'vitest';
import { Api, Event, Get, Param, Payload } from '../../../../../../main';
import {
  initializeMethod,
  setupTestingRestApi,
} from '../../../../../utils/testing.utils';

vi.mock('@lafken/resolver', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lafken/resolver')>();
  return {
    ...actual,
    LambdaHandler: vi.fn().mockImplementation(function (this: any) {
      this.arn = 'test-function';
      this.invokeArn = 'invokeArn';
    }),
  };
});

describe('lambda integration', () => {
  enableBuildEnvVariable();

  @Payload()
  class Data {
    @Param({
      source: 'body',
    })
    name: string;

    @Param({
      source: 'body',
    })
    age: number;
  }

  @Api()
  class TestingApi {
    @Get()
    lambdaHandler1() {}

    @Get({
      lambda: {
        enableTrace: true,
        services: ['s3', 'sqs'],
        memory: 2048,
      },
    })
    lambdaHandler2() {}

    @Get()
    lambdaHandler3(@Event(Data) _e: Data) {}
  }
  it('should create a lambda integration with default options', async () => {
    const { restApi, stack } = setupTestingRestApi();

    await initializeMethod(restApi, stack, TestingApi, 'lambdaHandler1');
    const synthesized = Testing.synth(stack);

    expect(LambdaHandler).toHaveBeenCalledWith(
      expect.anything(),
      'lambdaHandler1-TestingApi',
      expect.objectContaining({
        filename: 'lambda.spec.ts',
        method: 'GET',
        name: 'lambdaHandler1',
        path: '/',
        foldername: __dirname,
        principal: 'apigateway.amazonaws.com',
        suffix: 'api',
      })
    );
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      type: 'AWS',
      uri: 'invokeArn',
    });
  });

  it('should create a lambda integration with custom options', async () => {
    const { restApi, stack } = setupTestingRestApi();

    await initializeMethod(restApi, stack, TestingApi, 'lambdaHandler2');
    const synthesized = Testing.synth(stack);

    expect(LambdaHandler).toHaveBeenCalledWith(
      expect.anything(),
      'lambdaHandler2-TestingApi',
      expect.objectContaining({
        filename: 'lambda.spec.ts',
        lambda: { enableTrace: true, memory: 2048, services: ['s3', 'sqs'] },
        method: 'GET',
        name: 'lambdaHandler2',
        path: '/',
        foldername: __dirname,
        principal: 'apigateway.amazonaws.com',
        suffix: 'api',
      })
    );
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      type: 'AWS',
      uri: 'invokeArn',
    });
  });

  it('should create a lambda integration with event', async () => {
    const { restApi, stack } = setupTestingRestApi();

    await initializeMethod(restApi, stack, TestingApi, 'lambdaHandler3');
    const synthesized = Testing.synth(stack);

    expect(LambdaHandler).toHaveBeenCalledWith(
      expect.anything(),
      'lambdaHandler3-TestingApi',
      expect.objectContaining({
        filename: 'lambda.spec.ts',
        method: 'GET',
        name: 'lambdaHandler3',
        path: '/',
        foldername: __dirname,
        principal: 'apigateway.amazonaws.com',
        suffix: 'api',
      })
    );
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      type: 'AWS',
      request_templates: {
        'application/json':
          '{ #set($comma = "") $comma"name": "$input.path(\'$.name\')" #set($comma = ",")$comma"age": $input.path(\'$.age\') #set($comma = ",") }',
      },
      uri: 'invokeArn',
    });
  });
});
