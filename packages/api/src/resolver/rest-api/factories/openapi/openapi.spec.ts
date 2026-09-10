import { ApiGatewayAuthorizer } from '@cdktn/provider-aws/lib/api-gateway-authorizer';
import { ApiGatewayDeployment } from '@cdktn/provider-aws/lib/api-gateway-deployment';
import { ApiGatewayDocumentationVersion } from '@cdktn/provider-aws/lib/api-gateway-documentation-version';
import { ApiGatewayGatewayResponse } from '@cdktn/provider-aws/lib/api-gateway-gateway-response';
import { ApiGatewayIntegration } from '@cdktn/provider-aws/lib/api-gateway-integration';
import { ApiGatewayMethod } from '@cdktn/provider-aws/lib/api-gateway-method';
import { ApiGatewayMethodSettings } from '@cdktn/provider-aws/lib/api-gateway-method-settings';
import { ApiGatewayModel } from '@cdktn/provider-aws/lib/api-gateway-model';
import { ApiGatewayResource } from '@cdktn/provider-aws/lib/api-gateway-resource';
import { ApiGatewayRestApi } from '@cdktn/provider-aws/lib/api-gateway-rest-api';
import { ApiGatewayRestApiPolicy } from '@cdktn/provider-aws/lib/api-gateway-rest-api-policy';
import { ApiGatewayStage } from '@cdktn/provider-aws/lib/api-gateway-stage';
import { IamRole } from '@cdktn/provider-aws/lib/iam-role';
import { enableBuildEnvVariable } from '@lafken/common';
import { LambdaHandler } from '@lafken/resolver';
import { Testing } from 'cdktn';
import { describe, expect, it, vi } from 'vitest';
import {
  Api,
  ApiResponse,
  AuthorizerHandler,
  BodyParam,
  type BucketIntegrationResponse,
  CustomAuthorizer,
  type DynamoQueryIntegrationResponse,
  Event,
  type EventBridgePutEventsIntegrationResponse,
  Get,
  type KinesisPutRecordIntegrationResponse,
  Post,
  QueryParam,
  type QueueSendMessageIntegrationResponse,
  ResField,
  ResponseObject,
  type StateMachineStartIntegrationResponse,
} from '../../../../main';
import {
  initializeMethod,
  setupInternalTestingRestApi,
} from '../../../utils/testing.utils';
import type { DocumentationPartObject } from './openapi.types';

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

describe('OpenApi definition mode', () => {
  enableBuildEnvVariable();

  class Filters {
    @QueryParam()
    status: string;
  }

  class CreateBody {
    @BodyParam()
    name: string;
  }

  @Api()
  class OpenApiApi {
    @Get({ path: 'users' })
    list(@Event(Filters) _f: Filters) {}

    @Post({ path: 'users' })
    create(@Event(CreateBody) _b: CreateBody) {}
  }

  const setup = async () => {
    const { restApi, stack } = setupInternalTestingRestApi({ definition: 'openapi' });
    await initializeMethod(restApi, stack, OpenApiApi, 'list');
    await initializeMethod(restApi, stack, OpenApiApi, 'create');
    restApi.createStageDeployment();

    return { synth: Testing.synth(stack), restApi, stack };
  };

  it('injects an OpenAPI body and skips structural resources', async () => {
    const { synth } = await setup();

    expect(synth).toHaveResource(ApiGatewayRestApi);
    expect(synth).not.toHaveResource(ApiGatewayMethod);
    expect(synth).not.toHaveResource(ApiGatewayResource);
    expect(synth).not.toHaveResource(ApiGatewayIntegration);
    expect(synth).not.toHaveResource(ApiGatewayModel);

    expect(synth).toContain('x-amazon-apigateway-integration');
    expect(synth).toContain('/users');
    expect(synth).toContain('invokeArn');
    expect(synth).toContain('components');
    expect(synth).toContain('#/components/schemas/');
  });

  it('still creates the lambda, deployment and stage', async () => {
    const { synth } = await setup();

    expect(LambdaHandler).toHaveBeenCalled();
    expect(synth).toHaveResource(ApiGatewayDeployment);
    expect(synth).toHaveResource(ApiGatewayStage);
  });

  it('sets the resource policy on the rest api and in the body instead of a separate policy resource for a private endpoint', async () => {
    const { restApi, stack } = setupInternalTestingRestApi({
      definition: 'openapi',
      endpointConfiguration: {
        type: 'private',
        vpcEndpointIds: ['vpce-1234567890abcdef0'],
      },
    });
    await initializeMethod(restApi, stack, OpenApiApi, 'list');
    await initializeMethod(restApi, stack, OpenApiApi, 'create');
    restApi.createStageDeployment();

    const synth = Testing.synth(stack);

    expect(synth).not.toHaveResource(ApiGatewayRestApiPolicy);
    expect(synth).toHaveResourceWithProperties(ApiGatewayRestApi, {
      policy: expect.stringContaining('vpce-1234567890abcdef0'),
    });
    expect(synth).toContain('x-amazon-apigateway-policy');
    expect(synth).toContain('execute-api:/*');
    expect(synth).toContain('vpce-1234567890abcdef0');
  });

  it('embeds gateway responses in the body instead of separate response resources', async () => {
    const { restApi, stack } = setupInternalTestingRestApi({
      definition: 'openapi',
      defaultResponses: {
        unauthorized: { message: 'Unauthorized' },
      },
    });
    await initializeMethod(restApi, stack, OpenApiApi, 'list');
    await initializeMethod(restApi, stack, OpenApiApi, 'create');
    restApi.createStageDeployment();

    const synth = Testing.synth(stack);

    expect(synth).not.toHaveResource(ApiGatewayGatewayResponse);
    expect(synth).toContain('x-amazon-apigateway-gateway-responses');
    expect(synth).toContain('UNAUTHORIZED');
    expect(synth).toContain('Unauthorized');
  });

  it('creates method settings resources alongside the openapi body', async () => {
    @Api()
    class OpenApiMethodSettingsApi {
      @Get({
        path: 'users',
        methodSettings: {
          cachingEnabled: true,
          metricsEnabled: true,
          loggingLevel: 'info',
        },
      })
      list() {}
    }

    const { restApi, stack } = setupInternalTestingRestApi({ definition: 'openapi' });
    await initializeMethod(restApi, stack, OpenApiMethodSettingsApi, 'list');
    restApi.createStageDeployment();

    const synth = Testing.synth(stack);

    expect(synth).toHaveResourceWithProperties(ApiGatewayMethodSettings, {
      method_path: 'users/GET',
      stage_name: 'api',
      settings: {
        caching_enabled: true,
        metrics_enabled: true,
        logging_level: 'INFO',
      },
    });
  });
});

describe('OpenApi definition mode - auth, cors and docs', () => {
  enableBuildEnvVariable();

  @CustomAuthorizer({ name: 'custom-auth' })
  class CustomAuth {
    @AuthorizerHandler()
    handler() {}
  }

  @Api()
  class SecuredApi {
    @Get({ path: 'secure', auth: { authorizerName: 'custom-auth' } })
    secure() {}
  }

  it('folds authorizers into securitySchemes and emits CORS + description', async () => {
    const { restApi, stack } = setupInternalTestingRestApi({
      definition: 'openapi',
      description: 'My secured API',
      cors: { allowOrigins: true },
      auth: {
        authorizers: [CustomAuth],
        defaultAuthorizerName: 'custom-auth',
      },
    });
    await initializeMethod(restApi, stack, SecuredApi, 'secure');
    restApi.createStageDeployment();

    const synth = Testing.synth(stack);

    expect(synth).not.toHaveResource(ApiGatewayAuthorizer);
    expect(synth).toContain('securitySchemes');
    expect(synth).toContain('x-amazon-apigateway-authorizer');
    expect(synth).toContain('custom-auth');
    expect(synth).toContain('Access-Control-Allow-Origin');
    expect(synth).toContain('My secured API');

    const parsed = JSON.parse(synth);
    const api = Object.values(parsed.resource.aws_api_gateway_rest_api)[0] as {
      body: string;
    };
    expect(api.body).not.toContain('aws_api_gateway_rest_api.');

    // A REQUEST authorizer without an identity source must disable caching
    // (TTL 0), otherwise the API Gateway OpenAPI import rejects it.
    const doc = JSON.parse(api.body);
    const authorizer =
      doc.components.securitySchemes['custom-auth']['x-amazon-apigateway-authorizer'];
    expect(authorizer.identitySource).toBeUndefined();
    expect(authorizer.authorizerResultTtlInSeconds).toBe(0);
  });

  @Api({ tags: ['Users'] })
  class DocsApi {
    @Get({ path: 'users', summary: 'List users', description: 'Returns all users' })
    list() {}
  }

  it('embeds tags/description/summary as x-amazon-apigateway-documentation so they survive API Gateway import/export', async () => {
    const { restApi, stack } = setupInternalTestingRestApi({ definition: 'openapi' });
    await initializeMethod(restApi, stack, DocsApi, 'list');
    restApi.createStageDeployment();

    const synth = Testing.synth(stack);
    expect(synth).toContain('x-amazon-apigateway-documentation');

    const parsed = JSON.parse(synth);
    const api = Object.values(parsed.resource.aws_api_gateway_rest_api)[0] as {
      body: string;
    };
    const doc = JSON.parse(api.body);

    expect(doc.paths['/users'].get.tags).toEqual(['Users']);
    expect(doc.paths['/users'].get.summary).toBe('List users');
    expect(doc.paths['/users'].get.description).toBe('Returns all users');

    const methodPart = doc['x-amazon-apigateway-documentation'].documentationParts.find(
      (part: { location: { type: string } }) => part.location.type === 'METHOD'
    );
    expect(methodPart.location).toMatchObject({
      type: 'METHOD',
      method: 'GET',
      path: '/users',
    });
    expect(methodPart.properties).toMatchObject({
      tags: ['Users'],
      summary: 'List users',
      description: 'Returns all users',
    });

    expect(synth).toHaveResource(ApiGatewayDocumentationVersion);
    expect(synth).toHaveResourceWithProperties(ApiGatewayStage, {
      stage_name: 'api',
      documentation_version: expect.any(String),
    });
  });
});

describe('OpenApi definition mode - response models', () => {
  enableBuildEnvVariable();

  @ResponseObject()
  class Address {
    @ResField({ example: 'Main st' })
    street: string;
  }

  @ApiResponse({ description: 'A user' })
  class UserResponse {
    @ResField({ description: 'the name', example: 'Alice', deprecated: true })
    name: string;

    @ResField({ type: Address })
    address: Address;

    @ResField({ type: [Address], required: false })
    otherAddresses: Address[];
  }

  @ApiResponse()
  class NotFoundResponse {
    @ResField({ nullable: true })
    reason: string;
  }

  @ApiResponse({ responses: { 404: NotFoundResponse } })
  class ItemResponse {
    @ResField()
    id: string;
  }

  @Api()
  class ResponseApi {
    @Get({ path: 'users', response: UserResponse })
    getUser() {}

    @Post({ path: 'users', response: UserResponse })
    createUser() {}

    @Get({ path: 'items', response: [ItemResponse] })
    listItems() {}
  }

  const setup = async () => {
    const { restApi, stack } = setupInternalTestingRestApi({ definition: 'openapi' });
    await initializeMethod(restApi, stack, ResponseApi, 'getUser');
    await initializeMethod(restApi, stack, ResponseApi, 'createUser');
    await initializeMethod(restApi, stack, ResponseApi, 'listItems');
    restApi.createStageDeployment();

    const parsed = JSON.parse(Testing.synth(stack));
    const api = Object.values(parsed.resource.aws_api_gateway_rest_api)[0] as {
      body: string;
    };

    return JSON.parse(api.body);
  };

  it('references the response object schema in every operation that returns it', async () => {
    const doc = await setup();

    const content = {
      'application/json': { schema: { $ref: '#/components/schemas/UserResponse' } },
    };

    expect(doc.paths['/users'].get.responses['200'].content).toEqual(content);
    expect(doc.paths['/users'].post.responses['201'].content).toEqual(content);
    expect(Object.keys(doc.components.schemas)).toContain('UserResponse');
  });

  it('keeps every model field in the component schema and references nested objects', async () => {
    const doc = await setup();

    expect(doc.components.schemas.UserResponse).toEqual({
      type: 'object',
      description: 'A user',
      required: ['name', 'address'],
      additionalProperties: false,
      properties: {
        name: { type: 'string', description: 'the name' },
        address: { $ref: '#/components/schemas/Address' },
        otherAddresses: {
          type: 'array',
          items: { $ref: '#/components/schemas/Address' },
        },
      },
    });

    expect(doc.components.schemas.Address).toEqual({
      type: 'object',
      required: ['street'],
      additionalProperties: false,
      properties: { street: { type: 'string' } },
    });
  });

  it('wraps an array response in an array schema referencing the item model', async () => {
    const doc = await setup();

    const { schema } = doc.paths['/items'].get.responses['200'].content[
      'application/json'
    ] as { schema: { $ref: string } };
    const modelName = schema.$ref.replace('#/components/schemas/', '');

    expect(doc.components.schemas[modelName]).toEqual({
      type: 'array',
      items: { $ref: '#/components/schemas/ItemResponse' },
    });
  });

  it('references the schema declared for an additional status code', async () => {
    const doc = await setup();

    expect(doc.paths['/items'].get.responses['404'].content).toEqual({
      'application/json': {
        schema: { $ref: '#/components/schemas/NotFoundResponse' },
      },
    });
  });

  it('publishes example, deprecated and nullable as MODEL documentation parts', async () => {
    const doc = await setup();

    const modelParts = doc['x-amazon-apigateway-documentation'].documentationParts.filter(
      (part: DocumentationPartObject) => part.location.type === 'MODEL'
    );

    expect(modelParts).toEqual(
      expect.arrayContaining([
        {
          location: { type: 'MODEL', name: 'UserResponse' },
          properties: {
            description: 'A user',
            title: 'UserResponse',
            properties: { name: { example: 'Alice', deprecated: true } },
          },
        },
        {
          location: { type: 'MODEL', name: 'Address' },
          properties: {
            title: 'Address',
            properties: { street: { example: 'Main st' } },
          },
        },
        {
          location: { type: 'MODEL', name: 'NotFoundResponse' },
          properties: {
            title: 'NotFoundResponse',
            properties: { reason: { nullable: true } },
          },
        },
      ])
    );
  });

  it('declares each schema only once even when shared by several operations', async () => {
    const doc = await setup();

    const modelParts = doc['x-amazon-apigateway-documentation'].documentationParts.filter(
      (part: DocumentationPartObject) =>
        part.location.type === 'MODEL' && part.location.name === 'UserResponse'
    );

    expect(modelParts).toHaveLength(1);
  });
});

describe('OpenApi definition mode - AWS service integrations', () => {
  enableBuildEnvVariable();

  @Api()
  class ServiceApi {
    @Get({ path: 'mock', integration: 'mock' })
    mock() {
      return { foo: 'bar' };
    }

    @Get({ path: 'bucket', integration: 'bucket', action: 'Download' })
    bucket(): BucketIntegrationResponse {
      return { bucket: 'test', object: 'test.json' };
    }

    @Post({ path: 'state-machine', integration: 'state-machine', action: 'Start' })
    stateMachine(): StateMachineStartIntegrationResponse {
      return { stateMachineArn: 'arn', input: {} };
    }

    @Post({ path: 'queue', integration: 'queue', action: 'SendMessage' })
    queue(): QueueSendMessageIntegrationResponse {
      return { queueName: 'queue' };
    }

    @Post({ path: 'kinesis', integration: 'kinesis', action: 'PutRecord' })
    kinesis(): KinesisPutRecordIntegrationResponse {
      return { streamName: 'my-stream', data: 'hello', partitionKey: 'my-key' };
    }

    @Post({ path: 'event-bridge', integration: 'event-bridge', action: 'PutEvents' })
    eventBridge(): EventBridgePutEventsIntegrationResponse {
      return {
        eventBusName: 'orders-bus',
        source: 'orders',
        detailType: 'OrderCreated',
        detail: { orderId: '123' },
      };
    }

    @Get({ path: 'dynamo', integration: 'dynamodb', action: 'Query' })
    dynamo(): DynamoQueryIntegrationResponse {
      return { tableName: 'test', partitionKey: { name: 'test' } };
    }
  }

  it('emits x-amazon integrations for every backend and keeps IAM roles', async () => {
    const { restApi, stack } = setupInternalTestingRestApi({ definition: 'openapi' });

    for (const name of [
      'mock',
      'bucket',
      'stateMachine',
      'queue',
      'kinesis',
      'eventBridge',
      'dynamo',
    ]) {
      await initializeMethod(restApi, stack, ServiceApi, name);
    }
    restApi.createStageDeployment();

    const synth = Testing.synth(stack);

    expect(synth).not.toHaveResource(ApiGatewayIntegration);
    expect(synth).not.toHaveResource(ApiGatewayMethod);
    expect(synth).not.toHaveResource(ApiGatewayResource);

    // IAM roles for AWS-service integrations are still real resources.
    expect(synth).toHaveResource(IamRole);

    // Backend URIs land inside the body.
    expect(synth).toContain('s3:path');
    expect(synth).toContain('states:action/Start');
    expect(synth).toContain('sqs:path');
    expect(synth).toContain('kinesis:action/PutRecord');
    expect(synth).toContain('events:action/PutEvents');
    expect(synth).toContain('dynamodb:action/Query');
    expect(synth).toContain('mock');

    // The body must not reference the REST API's own address, otherwise
    // Terraform reports a self-referential block.
    const parsed = JSON.parse(synth);
    const api = Object.values(parsed.resource.aws_api_gateway_rest_api)[0] as {
      body: string;
    };
    expect(api.body).not.toContain('aws_api_gateway_rest_api.');
  });
});
