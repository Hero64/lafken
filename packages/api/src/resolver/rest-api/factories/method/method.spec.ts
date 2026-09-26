import { ApiGatewayIntegration } from '@cdktn/provider-aws/lib/api-gateway-integration';
import { ApiGatewayMethod } from '@cdktn/provider-aws/lib/api-gateway-method';
import { ApiGatewayResource } from '@cdktn/provider-aws/lib/api-gateway-resource';
import { type ClassResource, enableBuildEnvVariable, Streaming } from '@lafken/common';
import { LambdaHandler } from '@lafken/resolver';
import { Testing } from 'cdktn';
import { describe, expect, it, vi } from 'vitest';
import {
  Api,
  ApiRequest,
  BodyParam,
  type BucketIntegrationResponse,
  type DynamoQueryIntegrationResponse,
  Event,
  EventProxy,
  Get,
  PathParam,
  Post,
  type QueueSendMessageIntegrationResponse,
  type StateMachineStartIntegrationResponse,
} from '../../../../main';
import {
  initializeMethod,
  setupInternalTestingRestApi,
} from '../../../utils/testing.utils';

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

describe('Api Method', () => {
  enableBuildEnvVariable();

  @ApiRequest()
  class ProxyBody {
    @BodyParam()
    name: string;
  }

  @ApiRequest()
  class UserIdPayload {
    @PathParam()
    id: string;
  }

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

    @Streaming()
    @Get({
      path: 'bucket-streaming',
      integration: 'bucket',
      action: 'Download',
    })
    invalidStreamingBucketIntegration(): BucketIntegrationResponse {
      return {
        bucket: 'test',
        object: 'test.json',
      };
    }

    @Streaming()
    @Get({ path: 'streaming-without-proxy' })
    streamingWithoutProxy() {}

    @Get({ path: 'aws-proxy-with-event', integrationType: 'aws-proxy' })
    awsProxyWithEvent(@Event(ProxyBody) _e: ProxyBody) {}

    @Get({ path: 'proxy-event-on-aws' })
    proxyEventOnAws(@EventProxy(ProxyBody) _e: ProxyBody) {}

    @Streaming()
    @Get({ path: 'valid-streaming', integrationType: 'aws-proxy' })
    validStreaming(@EventProxy(ProxyBody) _e: ProxyBody) {}
  }

  @Api({
    path: '/users',
    methodSettings: {
      metricsEnabled: true,
    },
  })
  class InheritedMethodSettingsApi {
    @Post()
    create() {}

    @Get({ path: '/{id}' })
    getById(@Event(UserIdPayload) _event: UserIdPayload) {}
  }

  it('inherits class method settings using each handler concrete path', async () => {
    const { restApi, stack } = setupInternalTestingRestApi();

    await initializeMethod(restApi, stack, InheritedMethodSettingsApi, 'create');
    await initializeMethod(restApi, stack, InheritedMethodSettingsApi, 'getById');

    expect(restApi.methodFactory.settings).toEqual([
      {
        methodName: 'InheritedMethodSettingsApi-create-post',
        routeId: 'users-post',
        methodPath: 'users/POST',
        settings: { metricsEnabled: true },
      },
      {
        methodName: 'InheritedMethodSettingsApi-getById-get',
        routeId: 'users_param-get',
        methodPath: 'users/{id}/GET',
        settings: { metricsEnabled: true },
      },
    ]);
  });

  @Api({ path: '/users' })
  class RouteApi {
    @Get({ path: '/{id}', description: 'get user' })
    getUser(@Event(UserIdPayload) _event: UserIdPayload) {}
  }

  @Api({ path: '/users' })
  class RenamedRouteApi {
    @Get({ path: '/{id}', description: 'get user' })
    findUser(@Event(UserIdPayload) _event: UserIdPayload) {}
  }

  it('keeps the api gateway addresses when the handler is renamed', async () => {
    const synthAddresses = async (resource: ClassResource, handlerName: string) => {
      const { restApi, stack } = setupInternalTestingRestApi();
      await initializeMethod(restApi, stack, resource, handlerName);
      const { resource: resources } = JSON.parse(Testing.synth(stack));

      return Object.entries(resources as Record<string, Record<string, unknown>>)
        .filter(([type]) => type.startsWith('aws_api_gateway_'))
        .flatMap(([type, byId]) => Object.keys(byId).map((id) => `${type}.${id}`))
        .sort();
    };

    const before = await synthAddresses(RouteApi, 'getUser');
    const after = await synthAddresses(RenamedRouteApi, 'findUser');

    expect(before).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^aws_api_gateway_method\..*users_param-get-method/),
        expect.stringMatching(
          /^aws_api_gateway_documentation_part\..*users_param-get-doc-part/
        ),
      ])
    );
    expect(after).toEqual(before);
  });

  @Api({ path: '/users' })
  class DuplicatedRouteApi {
    @Get()
    list() {}

    @Get()
    listAgain() {}
  }

  it('should throw when two handlers define the same route', async () => {
    const { restApi, stack } = setupInternalTestingRestApi();

    await initializeMethod(restApi, stack, DuplicatedRouteApi, 'list');

    await expect(
      initializeMethod(restApi, stack, DuplicatedRouteApi, 'listAgain')
    ).rejects.toThrow(
      'Route "GET /users" of "DuplicatedRouteApi.listAgain" is already defined by "DuplicatedRouteApi.list"'
    );
  });

  it('should create a lambda integration method', async () => {
    const { restApi, stack } = setupInternalTestingRestApi();
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
    const { restApi, stack } = setupInternalTestingRestApi();
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
    const { restApi, stack } = setupInternalTestingRestApi();
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
        'application/json':
          '{"input": "{ #set($comma = "")  }","stateMachineArn": "arn"}',
      },
      type: 'AWS',
      uri: 'arn:aws:apigateway:${aws_api_gateway_rest_api.testing-api-api.region}:states:action/StartExecution',
    });
  });
  it('should create a queue integration method', async () => {
    const { restApi, stack } = setupInternalTestingRestApi();
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
    const { restApi, stack } = setupInternalTestingRestApi();
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

  it('throws when a handler using a non-lambda integration is decorated with @Streaming()', async () => {
    const { restApi, stack } = setupInternalTestingRestApi();

    await expect(
      initializeMethod(restApi, stack, TestingApi, 'invalidStreamingBucketIntegration')
    ).rejects.toThrow(/@Streaming\(\)/);
  });

  it('throws when @Streaming() is used without integrationType aws-proxy', async () => {
    const { restApi, stack } = setupInternalTestingRestApi();

    await expect(
      initializeMethod(restApi, stack, TestingApi, 'streamingWithoutProxy')
    ).rejects.toThrow(/aws-proxy/);
  });

  it('throws when @Event() is used with integrationType aws-proxy', async () => {
    const { restApi, stack } = setupInternalTestingRestApi();

    await expect(
      initializeMethod(restApi, stack, TestingApi, 'awsProxyWithEvent')
    ).rejects.toThrow(/@EventProxy\(\)/);
  });

  it('throws when @EventProxy() is used without integrationType aws-proxy', async () => {
    const { restApi, stack } = setupInternalTestingRestApi();

    await expect(
      initializeMethod(restApi, stack, TestingApi, 'proxyEventOnAws')
    ).rejects.toThrow(/@EventProxy\(\)/);
  });

  it('creates an AWS_PROXY integration for a valid streaming + @EventProxy handler', async () => {
    const { restApi, stack } = setupInternalTestingRestApi();

    await initializeMethod(restApi, stack, TestingApi, 'validStreaming');
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      type: 'AWS_PROXY',
      response_transfer_mode: 'STREAM',
    });
  });
});
