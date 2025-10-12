import { enableBuildEnvVariable } from '@alicanto/common';
import { alicantoResource } from '@alicanto/resolver';
import { ApiGatewayDeployment } from '@cdktf/provider-aws/lib/api-gateway-deployment';
import { ApiGatewayRestApi } from '@cdktf/provider-aws/lib/api-gateway-rest-api';
import { ApiGatewayStage } from '@cdktf/provider-aws/lib/api-gateway-stage';
import { TerraformStack, Testing } from 'cdktf';
import type { RestApiProps } from '../resolver.types';
import { RestApi } from './rest-api';

export const setupTestingRestApi = (props: Omit<RestApiProps, 'name'> = {}) => {
  const app = Testing.app();

  const stack = alicantoResource.create('app', TerraformStack, app, 'testing-stack');
  stack.isGlobal();

  const restApi = new RestApi(stack, 'testing-api', {
    ...props,
    name: 'testing-rest-api',
  });

  return {
    app,
    stack,
    restApi,
  };
};

describe('RestApi', () => {
  enableBuildEnvVariable();
  it('should create a simple rest api', () => {
    const { stack } = setupTestingRestApi();
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResource(ApiGatewayRestApi);
    expect(synthesized).toHaveResource(ApiGatewayStage);
    expect(synthesized).toHaveResource(ApiGatewayDeployment);
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
    const { stack } = setupTestingRestApi({
      stage: {
        stageName: 'test',
        xrayTracingEnabled: true,
      },
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayStage, {
      stage_name: 'test',
      xray_tracing_enabled: true,
    });
  });

  //TODO: test method with cors

  //TODO
});
