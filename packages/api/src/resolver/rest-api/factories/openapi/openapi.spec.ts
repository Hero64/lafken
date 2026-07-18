import { ApiGatewayAuthorizer } from '@cdktn/provider-aws/lib/api-gateway-authorizer';
import { ApiGatewayDeployment } from '@cdktn/provider-aws/lib/api-gateway-deployment';
import { ApiGatewayIntegration } from '@cdktn/provider-aws/lib/api-gateway-integration';
import { ApiGatewayMethod } from '@cdktn/provider-aws/lib/api-gateway-method';
import { ApiGatewayModel } from '@cdktn/provider-aws/lib/api-gateway-model';
import { ApiGatewayResource } from '@cdktn/provider-aws/lib/api-gateway-resource';
import { ApiGatewayRestApi } from '@cdktn/provider-aws/lib/api-gateway-rest-api';
import { ApiGatewayStage } from '@cdktn/provider-aws/lib/api-gateway-stage';
import { IamRole } from '@cdktn/provider-aws/lib/iam-role';
import { enableBuildEnvVariable } from '@lafken/common';
import { LambdaHandler } from '@lafken/resolver';
import { Testing } from 'cdktn';
import { describe, expect, it, vi } from 'vitest';
import {
  Api,
  AuthorizerHandler,
  BodyParam,
  type BucketIntegrationResponse,
  CustomAuthorizer,
  type DynamoQueryIntegrationResponse,
  Event,
  Get,
  type KinesisPutRecordIntegrationResponse,
  Post,
  QueryParam,
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

    @Get({ path: 'dynamo', integration: 'dynamodb', action: 'Query' })
    dynamo(): DynamoQueryIntegrationResponse {
      return { tableName: 'test', partitionKey: { name: 'test' } };
    }
  }

  it('emits x-amazon integrations for every backend and keeps IAM roles', async () => {
    const { restApi, stack } = setupInternalTestingRestApi({ definition: 'openapi' });

    for (const name of ['mock', 'bucket', 'stateMachine', 'queue', 'kinesis', 'dynamo']) {
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
