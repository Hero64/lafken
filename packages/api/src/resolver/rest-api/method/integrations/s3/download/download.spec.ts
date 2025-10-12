import {
  enableBuildEnvVariable,
  getResourceHandlerMetadata,
  getResourceMetadata,
} from '@alicanto/common';
import { alicantoResource } from '@alicanto/resolver';
import { ApiGatewayIntegration } from '@cdktf/provider-aws/lib/api-gateway-integration';
import { ApiGatewayIntegrationResponse } from '@cdktf/provider-aws/lib/api-gateway-integration-response';
import { ApiGatewayMethodResponse } from '@cdktf/provider-aws/lib/api-gateway-method-response';
import { ApiGatewayResource } from '@cdktf/provider-aws/lib/api-gateway-resource';
import { S3Bucket } from '@cdktf/provider-aws/lib/s3-bucket';
import { Testing } from 'cdktf';
import {
  Api,
  type ApiLambdaMetadata,
  type ApiResourceMetadata,
  type BucketIntegrationOption,
  type BucketIntegrationResponse,
  Event,
  Get,
  IntegrationOptions,
  Param,
  Payload,
} from '../../../../../../main';
import { setupTestingRestApi } from '../../../../rest-api.spec';

describe('Bucket download integration', () => {
  enableBuildEnvVariable();

  @Payload()
  class Download {
    @Param({
      source: 'path',
    })
    bucket: string;

    @Param({
      source: 'query',
    })
    object: string;
  }

  @Api()
  class BucketIntegrationApi {
    @Get({
      path: 'download',
      action: 'Download',
      integration: 'bucket',
    })
    download(): BucketIntegrationResponse {
      return {
        bucket: 'test',
        object: 'test.json',
      };
    }

    @Get({
      path: 'download/global-resource',
      action: 'Download',
      integration: 'bucket',
    })
    downloadGlobalResource(
      @IntegrationOptions() { getResourceValue }: BucketIntegrationOption
    ): BucketIntegrationResponse {
      return {
        bucket: getResourceValue('bucket::test', 'id'),
        object: 'test.json',
      };
    }

    @Get({
      path: 'download/event/{bucket}',
      action: 'Download',
      integration: 'bucket',
    })
    downloadEvent(@Event(Download) e: Download): BucketIntegrationResponse {
      return {
        bucket: e.bucket,
        object: e.object,
      };
    }
  }

  it('should create s3 integration', async () => {
    const { restApi, stack } = setupTestingRestApi();

    const handlers = getResourceHandlerMetadata<ApiLambdaMetadata>(BucketIntegrationApi);
    const resourceMetadata =
      getResourceMetadata<ApiResourceMetadata>(BucketIntegrationApi);

    const downloadHandler = handlers.find(
      (h) => h.name === 'download'
    ) as ApiLambdaMetadata;

    await restApi.addMethod(stack, {
      classResource: BucketIntegrationApi,
      handler: downloadHandler,
      resourceMetadata,
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResource(ApiGatewayResource);
    expect(synthesized).toHaveResource(ApiGatewayResource);
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'GET',
      type: 'AWS',
      uri: 'arn:aws:apigateway:${aws_api_gateway_rest_api.testing-rest-api.region}:s3:path/test/test.json',
    });
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodResponse, {
      response_parameters: {
        'method.response.header.Content-Disposition': true,
        'method.response.header.Content-Type': true,
      },
      status_code: '200',
    });
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegrationResponse, {
      response_parameters: {
        'method.response.header.Content-Type': 'integration.response.header.Content-Type',
      },
      status_code: '200',
    });
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegrationResponse, {
      selection_pattern: '4\\d{2}',
      response_templates: {
        'application/json': '{"error": "Bad request"}',
      },
      status_code: '400',
    });
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegrationResponse, {
      selection_pattern: '5\\d{2}',
      response_templates: {
        'application/json': '{"error": "Internal server error"}',
      },
      status_code: '500',
    });
  });

  it('should create s3 integration with global resource', async () => {
    const { restApi, stack } = setupTestingRestApi();

    const handlers = getResourceHandlerMetadata<ApiLambdaMetadata>(BucketIntegrationApi);
    const resourceMetadata =
      getResourceMetadata<ApiResourceMetadata>(BucketIntegrationApi);

    const downloadHandler = handlers.find(
      (h) => h.name === 'downloadGlobalResource'
    ) as ApiLambdaMetadata;

    const bucket = alicantoResource.create('bucket', S3Bucket, stack, 'test');
    bucket.isGlobal();

    await restApi.addMethod(stack, {
      classResource: BucketIntegrationApi,
      handler: downloadHandler,
      resourceMetadata,
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'GET',
      type: 'AWS',
      uri: 'arn:aws:apigateway:${aws_api_gateway_rest_api.testing-rest-api.region}:s3:path/${aws_s3_bucket.test.id}/test.json',
    });
  });

  it('should create s3 integration with event prop', async () => {
    const { restApi, stack } = setupTestingRestApi();

    const handlers = getResourceHandlerMetadata<ApiLambdaMetadata>(BucketIntegrationApi);
    const resourceMetadata =
      getResourceMetadata<ApiResourceMetadata>(BucketIntegrationApi);

    const downloadHandler = handlers.find(
      (h) => h.name === 'downloadEvent'
    ) as ApiLambdaMetadata;

    await restApi.addMethod(stack, {
      classResource: BucketIntegrationApi,
      handler: downloadHandler,
      resourceMetadata,
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'GET',
      request_parameters: {
        'integration.request.path.bucket': 'method.request.path.bucket',
        'integration.request.path.object': 'method.request.querystring.object',
      },
      type: 'AWS',
      uri: 'arn:aws:apigateway:${aws_api_gateway_rest_api.testing-rest-api.region}:s3:path/{bucket}/{object}',
    });
  });
});
