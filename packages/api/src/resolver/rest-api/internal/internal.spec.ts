import { ApiGatewayGatewayResponse } from '@cdktn/provider-aws/lib/api-gateway-gateway-response';
import { ApiGatewayMethod } from '@cdktn/provider-aws/lib/api-gateway-method';
import { ApiGatewayResource } from '@cdktn/provider-aws/lib/api-gateway-resource';
import { ApiGatewayRestApi } from '@cdktn/provider-aws/lib/api-gateway-rest-api';
import { ApiGatewayRestApiPolicy } from '@cdktn/provider-aws/lib/api-gateway-rest-api-policy';
import {
  enableBuildEnvVariable,
  getResourceHandlerMetadata,
  getResourceMetadata,
} from '@lafken/common';
import { Testing } from 'cdktn';
import { describe, expect, it } from 'vitest';
import {
  Api,
  type ApiLambdaMetadata,
  type ApiResourceMetadata,
  type BucketIntegrationResponse,
  Delete,
  Get,
} from '../../../main';
import { setupInternalTestingRestApi } from '../../utils/testing.utils';

describe('InternalRestApi', () => {
  enableBuildEnvVariable();
  it('should create a simple rest api', () => {
    const { stack } = setupInternalTestingRestApi();
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResource(ApiGatewayRestApi);
  });

  it('should create a rest api with custom properties', () => {
    const { stack } = setupInternalTestingRestApi({
      supportedMediaTypes: ['application/json', 'application/pdf'],
      disableExecuteApiEndpoint: true,
      minCompressionSize: 1000,
    });
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayRestApi, {
      binary_media_types: ['application/json', 'application/pdf'],
      disable_execute_api_endpoint: true,
      minimum_compression_size: '1000',
    });
  });

  it('should add endpoint configuration for private endpoint type', () => {
    const { stack } = setupInternalTestingRestApi({
      endpointConfiguration: {
        type: 'private',
        vpcEndpointIds: ['vpce-1234567890abcdef0'],
      },
    });
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayRestApi, {
      endpoint_configuration: {
        types: ['PRIVATE'],
        ip_address_type: 'dualstack',
        vpc_endpoint_ids: ['vpce-1234567890abcdef0'],
      },
    });
  });

  it('should create a new method', async () => {
    @Api()
    class TestingApi {
      @Get({
        integration: 'bucket',
        action: 'Download',
        path: 'test/method',
      })
      get(): BucketIntegrationResponse {
        return {
          bucket: 'test',
          object: 'foo.json',
        };
      }
    }

    const { stack, restApi, app } = setupInternalTestingRestApi();

    const method = getResourceHandlerMetadata<ApiLambdaMetadata>(TestingApi);
    const metadata = getResourceMetadata<ApiResourceMetadata>(TestingApi);

    await restApi.addMethod(app, {
      classResource: TestingApi,
      handler: method[0],
      resourceMetadata: metadata,
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayResource, {
      path_part: 'test',
    });
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayResource, {
      path_part: 'method',
    });
    expect(synthesized).toHaveResource(ApiGatewayMethod);
  });

  it('should enable cors in  method', async () => {
    @Api()
    class TestingApi {
      @Get({
        integration: 'bucket',
        action: 'Download',
        path: 'test/method',
      })
      get(): BucketIntegrationResponse {
        return {
          bucket: 'test',
          object: 'foo.json',
        };
      }
    }

    const { stack, restApi, app } = setupInternalTestingRestApi({
      cors: {
        allowOrigins: true,
      },
    });

    const method = getResourceHandlerMetadata<ApiLambdaMetadata>(TestingApi);
    const metadata = getResourceMetadata<ApiResourceMetadata>(TestingApi);

    await restApi.addMethod(app, {
      classResource: TestingApi,
      handler: method[0],
      resourceMetadata: metadata,
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethod, {
      http_method: 'OPTIONS',
    });
  });

  it('should create a single OPTIONS method for a path served by several methods', async () => {
    @Api({ path: 'users' })
    class TestingApiShared {
      @Get({ integration: 'bucket', action: 'Download', path: 'file' })
      read(): BucketIntegrationResponse {
        return { bucket: 'test', object: 'foo.json' };
      }

      @Delete({ integration: 'bucket', action: 'Delete', path: 'file' })
      remove(): BucketIntegrationResponse {
        return { bucket: 'test', object: 'foo.json' };
      }
    }

    const { stack, restApi, app } = setupInternalTestingRestApi({
      cors: { allowOrigins: true },
    });
    const metadata = getResourceMetadata<ApiResourceMetadata>(TestingApiShared);

    for (const handler of getResourceHandlerMetadata<ApiLambdaMetadata>(
      TestingApiShared
    )) {
      await restApi.addMethod(app, {
        classResource: TestingApiShared,
        handler,
        resourceMetadata: metadata,
      });
    }

    const methods = Object.values<{ http_method: string }>(
      JSON.parse(Testing.synth(stack)).resource.aws_api_gateway_method
    );

    // A second one lands on the same resource and API Gateway rejects the apply.
    expect(methods.filter(({ http_method }) => http_method === 'OPTIONS')).toHaveLength(
      1
    );
  });

  it('should add cors headers to the default gateway responses', () => {
    const { stack } = setupInternalTestingRestApi({
      cors: { allowOrigins: 'https://example.com' },
    });

    const synthesized = Testing.synth(stack);

    for (const responseType of ['DEFAULT_4XX', 'DEFAULT_5XX']) {
      expect(synthesized).toHaveResourceWithProperties(ApiGatewayGatewayResponse, {
        response_type: responseType,
        response_parameters: {
          'gatewayresponse.header.Access-Control-Allow-Origin': "'https://example.com'",
          'gatewayresponse.header.Vary': "'Origin'",
        },
      });
    }
  });

  it('should deploy after the gateway responses', async () => {
    @Api()
    class TestingApiDeploy {
      @Get({ integration: 'bucket', action: 'Download', path: 'test/method' })
      get(): BucketIntegrationResponse {
        return { bucket: 'test', object: 'foo.json' };
      }
    }

    const { stack, restApi, app } = setupInternalTestingRestApi({
      cors: { allowOrigins: 'https://example.com' },
    });

    await restApi.addMethod(app, {
      classResource: TestingApiDeploy,
      handler: getResourceHandlerMetadata<ApiLambdaMetadata>(TestingApiDeploy)[0],
      resourceMetadata: getResourceMetadata<ApiResourceMetadata>(TestingApiDeploy),
    });
    restApi.createStageDeployment();

    const resources = JSON.parse(Testing.synth(stack)).resource;
    const deployment = Object.values<{ depends_on: string[] }>(
      resources.aws_api_gateway_deployment
    )[0];
    const gatewayResponseIds = Object.keys(resources.aws_api_gateway_gateway_response);

    expect(gatewayResponseIds).toHaveLength(2);
    for (const id of gatewayResponseIds) {
      expect(deployment.depends_on).toContain(`aws_api_gateway_gateway_response.${id}`);
    }
  });

  it('should not add gateway responses when cors is disabled', () => {
    const { stack } = setupInternalTestingRestApi({
      cors: { allowOrigins: false },
    });

    expect(
      JSON.parse(Testing.synth(stack)).resource.aws_api_gateway_gateway_response
    ).toBeUndefined();
  });

  it('should not add cors headers to gateway responses when addToErrorResponses is false', () => {
    const { stack } = setupInternalTestingRestApi({
      cors: { allowOrigins: 'https://example.com', addToErrorResponses: false },
    });

    expect(
      JSON.parse(Testing.synth(stack)).resource.aws_api_gateway_gateway_response
    ).toBeUndefined();
  });

  it('should create a rest api policy when private endpoint with vpcEndpointIds is provided', async () => {
    @Api()
    class TestingApiPrivate {
      @Get({
        integration: 'bucket',
        action: 'Download',
        path: 'test/method',
      })
      get(): BucketIntegrationResponse {
        return {
          bucket: 'test',
          object: 'foo.json',
        };
      }
    }

    const { stack, restApi, app } = setupInternalTestingRestApi({
      endpointConfiguration: {
        type: 'private',
        vpcEndpointIds: ['vpce-1234567890abcdef0'],
      },
    });

    const method = getResourceHandlerMetadata<ApiLambdaMetadata>(TestingApiPrivate);
    const metadata = getResourceMetadata<ApiResourceMetadata>(TestingApiPrivate);

    await restApi.addMethod(app, {
      classResource: TestingApiPrivate,
      handler: method[0],
      resourceMetadata: metadata,
    });

    restApi.createStageDeployment();

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayRestApiPolicy, {
      policy: expect.stringContaining('vpce-1234567890abcdef0'),
    });
  });
});
