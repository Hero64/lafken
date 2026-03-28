import { ApiGatewayMethod } from '@cdktn/provider-aws/lib/api-gateway-method';
import { ApiGatewayResource } from '@cdktn/provider-aws/lib/api-gateway-resource';
import { ApiGatewayStage } from '@cdktn/provider-aws/lib/api-gateway-stage';
import { DataAwsApiGatewayRestApi } from '@cdktn/provider-aws/lib/data-aws-api-gateway-rest-api';
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
} from '../../../main';
import { setupExternalTestingRestApi } from '../../utils/testing.utils';

describe('ExternalRestApi', () => {
  enableBuildEnvVariable();

  it('should create a simple rest api', () => {
    const { stack } = setupExternalTestingRestApi({});
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveDataSource(DataAwsApiGatewayRestApi);
  });

  it('should create a rest api stage', () => {
    const { stack, restApi } = setupExternalTestingRestApi({
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

    const { stack, restApi, app } = setupExternalTestingRestApi({});

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

  it('should enable cors in method', async () => {
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

    const { stack, restApi, app } = setupExternalTestingRestApi({
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
