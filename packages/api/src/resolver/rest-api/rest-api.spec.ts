import { ApiGatewayMethod } from '@cdktn/provider-aws/lib/api-gateway-method';
import { ApiGatewayResource } from '@cdktn/provider-aws/lib/api-gateway-resource';
import { ApiGatewayRestApi } from '@cdktn/provider-aws/lib/api-gateway-rest-api';
import { ApiGatewayStage } from '@cdktn/provider-aws/lib/api-gateway-stage';
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
  Get,
} from '../../main';
import { setupTestingRestApi } from '../utils/testing.utils';

describe('RestApi', () => {
  enableBuildEnvVariable();
  it('should create a simple rest api', () => {
    const { stack } = setupTestingRestApi();
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResource(ApiGatewayRestApi);
  });

  it('should create a rest api with custom properties', () => {
    const { stack } = setupTestingRestApi({
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

  it('should create a rest api stage', () => {
    const { stack, restApi } = setupTestingRestApi({
      stage: {
        stageName: 'test',
        xrayTracingEnabled: true,
      },
    });

    restApi.createStageDeployment();

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayStage, {
      stage_name: 'test',
      xray_tracing_enabled: true,
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

    const { stack, restApi, app } = setupTestingRestApi();

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

    const { stack, restApi, app } = setupTestingRestApi({
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
});
