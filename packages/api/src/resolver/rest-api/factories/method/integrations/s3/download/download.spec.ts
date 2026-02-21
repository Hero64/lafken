import { ApiGatewayIntegration } from '@cdktn/provider-aws/lib/api-gateway-integration';
import { ApiGatewayIntegrationResponse } from '@cdktn/provider-aws/lib/api-gateway-integration-response';
import { ApiGatewayMethodResponse } from '@cdktn/provider-aws/lib/api-gateway-method-response';
import { ApiGatewayResource } from '@cdktn/provider-aws/lib/api-gateway-resource';
import { IamRole } from '@cdktn/provider-aws/lib/iam-role';
import { IamRolePolicy } from '@cdktn/provider-aws/lib/iam-role-policy';
import { S3Bucket } from '@cdktn/provider-aws/lib/s3-bucket';
import {
  enableBuildEnvVariable,
  getResourceHandlerMetadata,
  getResourceMetadata,
} from '@lafken/common';
import { lafkenResource } from '@lafken/resolver';
import { Testing } from 'cdktn';
import { describe, expect, it } from 'vitest';
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
} from '../../../../../../../main';
import { setupTestingRestApi } from '../../../../../../utils/testing.utils';

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
        bucket: getResourceValue('test', 'id'),
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
      uri: 'arn:aws:apigateway:${aws_api_gateway_rest_api.testing-api-api.region}:s3:path/test/test.json',
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
    expect(synthesized).toHaveResourceWithProperties(IamRole, {
      assume_role_policy:
        '${jsonencode({"Version" = "2012-10-17", "Statement" = [{"Action" = "sts:AssumeRole", "Effect" = "Allow", "Principal" = {"Service" = "apigateway.amazonaws.com"}}]})}',
      name: 's3-read',
    });

    expect(synthesized).toHaveResourceWithProperties(IamRolePolicy, {
      policy:
        '${jsonencode({"Version" = "2012-10-17", "Statement" = [{"Effect" = "Allow", "Action" = ["s3:GetObject"], "Resource" = ["*"]}]})}',
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

    const Bucket = lafkenResource.make(S3Bucket);

    const bucket = new Bucket(stack, 'test');
    bucket.isGlobal('bucket', 'test');

    await restApi.addMethod(stack, {
      classResource: BucketIntegrationApi,
      handler: downloadHandler,
      resourceMetadata,
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'GET',
      type: 'AWS',
      uri: 'arn:aws:apigateway:${aws_api_gateway_rest_api.testing-api-api.region}:s3:path/${aws_s3_bucket.test.id}/test.json',
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
      uri: 'arn:aws:apigateway:${aws_api_gateway_rest_api.testing-api-api.region}:s3:path/{bucket}/{object}',
    });
  });
});
