import 'cdktn/lib/testing/adapters/jest';
import { ApiGatewayIntegration } from '@cdktn/provider-aws/lib/api-gateway-integration';
import { ApiGatewayMethod } from '@cdktn/provider-aws/lib/api-gateway-method';
import { ApiGatewayResource } from '@cdktn/provider-aws/lib/api-gateway-resource';
import { enableBuildEnvVariable } from '@lafken/common';
import { LambdaHandler } from '@lafken/resolver';
import { Testing } from 'cdktn';
import {
  Api,
  type BucketIntegrationResponse,
  type DynamoQueryIntegrationResponse,
  Get,
  type QueueSendMessageIntegrationResponse,
  type StateMachineStartIntegrationResponse,
} from '../../../../main';
import { initializeMethod, setupTestingRestApi } from '../../../utils/testing.utils';

jest.mock('@lafken/resolver', () => {
  const actual = jest.requireActual('@lafken/resolver');

  return {
    ...actual,
    LambdaHandler: jest.fn().mockImplementation(() => ({
      arn: 'test-function',
      invokeArn: 'invokeArn',
    })),
  };
});

describe('Api Method', () => {
  enableBuildEnvVariable();
  @Api()
  class TestingApi {
    @Get({
      path: 'lambda',
    })
    lambdaIntegration() {}

    @Get({
      path: 'bucket',
      integration: 'bucket',
      action: 'Download',
    })
    bucketIntegration(): BucketIntegrationResponse {
      return {
        bucket: 'test',
        object: 'test.json',
      };
    }

    @Get({
      path: 'state-machine',
      integration: 'state-machine',
      action: 'Start',
    })
    stateMachineIntegration(): StateMachineStartIntegrationResponse {
      return {
        stateMachineArn: 'arn',
        input: {},
      };
    }

    @Get({
      path: 'queue',
      integration: 'queue',
      action: 'SendMessage',
    })
    queueIntegration(): QueueSendMessageIntegrationResponse {
      return {
        queueName: 'queue',
      };
    }

    @Get({
      path: 'dynamo',
      integration: 'dynamodb',
      action: 'Query',
    })
    dynamoIntegration(): DynamoQueryIntegrationResponse {
      return {
        tableName: 'test',
        partitionKey: {
          name: 'test',
        },
      };
    }
  }

  it('should create a lambda integration method', async () => {
    const { restApi, stack } = setupTestingRestApi();
    await initializeMethod(restApi, stack, TestingApi, 'lambdaIntegration');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResource(ApiGatewayMethod);
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayResource, {
      path_part: 'lambda',
    });

    expect(LambdaHandler).toHaveBeenCalledWith(
      expect.anything(),
      'lambdaIntegration-TestingApi',
      expect.objectContaining({
        filename: 'method.spec.ts',
        method: 'GET',
        name: 'lambdaIntegration',
        path: 'lambda',
        principal: 'apigateway.amazonaws.com',
        suffix: 'api',
      })
    );
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      type: 'AWS',
      uri: 'invokeArn',
    });
  });

  it('should create a s3 integration method', async () => {
    const { restApi, stack } = setupTestingRestApi();
    await initializeMethod(restApi, stack, TestingApi, 'bucketIntegration');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResource(ApiGatewayMethod);
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayResource, {
      path_part: 'bucket',
    });
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      type: 'AWS',
      uri: 'arn:aws:apigateway:${aws_api_gateway_rest_api.testing-api-api.region}:s3:path/test/test.json',
    });
  });

  it('should create a step function integration method', async () => {
    const { restApi, stack } = setupTestingRestApi();
    await initializeMethod(restApi, stack, TestingApi, 'stateMachineIntegration');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResource(ApiGatewayMethod);
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayResource, {
      path_part: 'state-machine',
    });
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'POST',
      passthrough_behavior: 'WHEN_NO_TEMPLATES',
      request_templates: {
        'application/json': '{"input": "{  }","stateMachineArn": "arn"}',
      },
      type: 'AWS',
      uri: 'arn:aws:apigateway:${aws_api_gateway_rest_api.testing-api-api.region}:states:action/StartExecution',
    });
  });
  it('should create a queue integration method', async () => {
    const { restApi, stack } = setupTestingRestApi();
    await initializeMethod(restApi, stack, TestingApi, 'queueIntegration');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResource(ApiGatewayMethod);
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayResource, {
      path_part: 'queue',
    });
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'POST',
      passthrough_behavior: 'WHEN_NO_TEMPLATES',
      request_parameters: {
        'integration.request.header.Content-Type': "'application/x-www-form-urlencoded'",
      },
      request_templates: {
        'application/json': 'Action=SendMessage',
      },
      type: 'AWS',
      uri: 'arn:aws:apigateway:${aws_api_gateway_rest_api.testing-api-api.region}:sqs:path/${data.aws_caller_identity.TestingApi-queueIntegration-identity.account_id}/queue',
    });
  });

  it('should create a dynamo integration method', async () => {
    const { restApi, stack } = setupTestingRestApi();
    await initializeMethod(restApi, stack, TestingApi, 'dynamoIntegration');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResource(ApiGatewayMethod);
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayResource, {
      path_part: 'dynamo',
    });
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'POST',
      passthrough_behavior: 'WHEN_NO_TEMPLATES',
      request_templates: {
        'application/json':
          '{"TableName": "test","KeyConditionExpression": "#name = :partitionKey","ExpressionAttributeValues": { #set($comma = "") $comma":partitionKey": { "S": "test" } #set($comma = ",") },"ExpressionAttributeNames": { #set($comma = "") $comma"#name": "name" #set($comma = ",") }}',
      },
      type: 'AWS',
      uri: 'arn:aws:apigateway:${aws_api_gateway_rest_api.testing-api-api.region}:dynamodb:action/Query',
    });
  });
});
