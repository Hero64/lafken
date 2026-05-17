import { ApiGatewayIntegration } from '@cdktn/provider-aws/lib/api-gateway-integration';
import { ApiGatewayIntegrationResponse } from '@cdktn/provider-aws/lib/api-gateway-integration-response';
import { ApiGatewayMethodResponse } from '@cdktn/provider-aws/lib/api-gateway-method-response';
import { IamRole } from '@cdktn/provider-aws/lib/iam-role';
import { IamRolePolicy } from '@cdktn/provider-aws/lib/iam-role-policy';
import { KinesisStream } from '@cdktn/provider-aws/lib/kinesis-stream';
import { enableBuildEnvVariable } from '@lafken/common';
import { lafkenResource } from '@lafken/resolver';
import { Testing } from 'cdktn';
import { describe, expect, it } from 'vitest';
import {
  Api,
  ApiRequest,
  BodyParam,
  Event,
  Get,
  IntegrationOptions,
  type KinesisIntegrationOption,
  type KinesisPutRecordIntegrationResponse,
  QueryParam,
} from '../../../../../../../main';
import {
  initializeMethod,
  setupInternalTestingRestApi,
} from '../../../../../../utils/testing.utils';

describe('Kinesis put record integration', () => {
  enableBuildEnvVariable();

  @ApiRequest()
  class PutRecordEvent {
    @BodyParam()
    payload: string;

    @QueryParam()
    partitionId: string;
  }

  @Api()
  class TestingApi {
    @Get({
      integration: 'kinesis',
      action: 'PutRecord',
    })
    putRecord(): KinesisPutRecordIntegrationResponse {
      return {
        streamName: 'my-stream',
        data: 'hello',
        partitionKey: 'my-key',
      };
    }

    @Get({
      integration: 'kinesis',
      action: 'PutRecord',
    })
    putRecordWithResource(
      @IntegrationOptions() { getResourceValue }: KinesisIntegrationOption
    ): KinesisPutRecordIntegrationResponse {
      return {
        streamName: getResourceValue('kinesis::test', 'name'),
        data: 'hello',
        partitionKey: 'my-key',
      };
    }

    @Get({
      integration: 'kinesis',
      action: 'PutRecord',
    })
    putRecordWithEvent(
      @Event(PutRecordEvent) e: PutRecordEvent
    ): KinesisPutRecordIntegrationResponse {
      return {
        streamName: 'my-stream',
        data: e.payload,
        partitionKey: e.partitionId,
      };
    }
  }

  it('should create kinesis put record integration', async () => {
    const { restApi, stack } = setupInternalTestingRestApi();

    await initializeMethod(restApi, stack, TestingApi, 'putRecord');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'POST',
      passthrough_behavior: 'WHEN_NO_TEMPLATES',
      request_parameters: {
        'integration.request.header.Content-Type': "'application/x-amz-json-1.1'",
      },
      request_templates: {
        'application/json':
          '{ "StreamName": "my-stream", "Data": "$util.base64Encode(\'hello\')", "PartitionKey": "my-key" }',
      },
      type: 'AWS',
      uri: 'arn:aws:apigateway:${aws_api_gateway_rest_api.testing-api-api.region}:kinesis:action/PutRecord',
    });

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodResponse, {
      status_code: '200',
    });

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegrationResponse, {
      status_code: '200',
    });

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegrationResponse, {
      selection_pattern: '4\\d{2}',
      response_templates: {
        'application/json': '{"message": "Bad request"}',
      },
      status_code: '400',
    });

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegrationResponse, {
      selection_pattern: '5\\d{2}',
      response_templates: {
        'application/json': '{"message": "Internal server error"}',
      },
      status_code: '500',
    });

    expect(synthesized).toHaveResourceWithProperties(IamRole, {
      assume_role_policy:
        '${jsonencode({"Version" = "2012-10-17", "Statement" = [{"Action" = "sts:AssumeRole", "Effect" = "Allow", "Principal" = {"Service" = "apigateway.amazonaws.com"}}]})}',
      name: 'TestingApi-putRecord-integration',
    });

    expect(synthesized).toHaveResourceWithProperties(IamRolePolicy, {
      policy:
        '${jsonencode({"Version" = "2012-10-17", "Statement" = [{"Effect" = "Allow", "Action" = ["kinesis:PutRecord"], "Resource" = ["*"]}]})}',
    });
  });

  it('should create kinesis put record integration with global resource', async () => {
    const { restApi, stack } = setupInternalTestingRestApi();

    const Stream = lafkenResource.make(KinesisStream);
    const stream = new Stream(stack, 'test', { name: 'test-stream' });
    stream.register('kinesis', 'test');

    await initializeMethod(restApi, stack, TestingApi, 'putRecordWithResource');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'POST',
      passthrough_behavior: 'WHEN_NO_TEMPLATES',
      request_templates: {
        'application/json':
          '{ "StreamName": "${aws_kinesis_stream.test.name}", "Data": "$util.base64Encode(\'hello\')", "PartitionKey": "my-key" }',
      },
      type: 'AWS',
      uri: 'arn:aws:apigateway:${aws_api_gateway_rest_api.testing-api-api.region}:kinesis:action/PutRecord',
    });
  });

  it('should create kinesis put record integration with event params', async () => {
    const { restApi, stack } = setupInternalTestingRestApi();

    await initializeMethod(restApi, stack, TestingApi, 'putRecordWithEvent');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'POST',
      passthrough_behavior: 'WHEN_NO_TEMPLATES',
      request_templates: {
        'application/json':
          '{ "StreamName": "my-stream", "Data": "$util.base64Encode($input.json(\'$.payload\'))", "PartitionKey": "$input.params(\'partitionId\')" }',
      },
      type: 'AWS',
      uri: 'arn:aws:apigateway:${aws_api_gateway_rest_api.testing-api-api.region}:kinesis:action/PutRecord',
    });
  });
});
