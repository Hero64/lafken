import 'cdktf/lib/testing/adapters/jest';
import { enableBuildEnvVariable } from '@alicanto/common';
import { LambdaHandler } from '@alicanto/resolver';
import { ApiGatewayIntegration } from '@cdktf/provider-aws/lib/api-gateway-integration';
import { Testing } from 'cdktf';
import { Api, Event, Get, Param, Payload } from '../../../../../../main';
import {
  initializeMethod,
  setupTestingRestApi,
} from '../../../../../utils/testing.utils';

jest.mock('@alicanto/resolver', () => {
  const actual = jest.requireActual('@alicanto/resolver');

  return {
    ...actual,
    LambdaHandler: jest.fn().mockImplementation(() => ({
      arn: 'test-function',
      invokeArn: 'invokeArn',
    })),
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
        pathName: __dirname,
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
        pathName: __dirname,
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
        pathName: __dirname,
        principal: 'apigateway.amazonaws.com',
        suffix: 'api',
      })
    );
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      type: 'AWS',
      request_templates: {
        'application/json':
          '{ #set($comma = "") $comma"name": $input.json(\'$.name\') #set($comma = ",")$comma"age": $input.json(\'$.age\') #set($comma = ",") }',
      },
      uri: 'invokeArn',
    });
  });
});
