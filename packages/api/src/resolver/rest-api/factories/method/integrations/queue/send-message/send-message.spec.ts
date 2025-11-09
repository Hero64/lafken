import 'cdktf/lib/testing/adapters/jest';
import { enableBuildEnvVariable } from '@alicanto/common';
import { alicantoResource } from '@alicanto/resolver';
import { ApiGatewayIntegration } from '@cdktf/provider-aws/lib/api-gateway-integration';
import { ApiGatewayIntegrationResponse } from '@cdktf/provider-aws/lib/api-gateway-integration-response';
import { ApiGatewayMethodResponse } from '@cdktf/provider-aws/lib/api-gateway-method-response';
import { IamRole } from '@cdktf/provider-aws/lib/iam-role';
import { IamRolePolicy } from '@cdktf/provider-aws/lib/iam-role-policy';
import { SqsQueue } from '@cdktf/provider-aws/lib/sqs-queue';
import { Testing } from 'cdktf';
import {
  Api,
  Delete,
  Event,
  Get,
  IntegrationOptions,
  Param,
  Payload,
  type QueueIntegrationOption,
  type QueueSendMessageIntegrationResponse,
} from '../../../../../../../main';
import {
  initializeMethod,
  setupTestingRestApi,
} from '../../../../../../utils/testing.utils';

describe('Queue send message integration', () => {
  enableBuildEnvVariable();

  @Payload()
  class SendMessageEvent {
    @Param()
    attribute1: string;
  }

  @Api()
  class TestingApi {
    @Get({
      integration: 'queue',
      action: 'SendMessage',
    })
    sendMessage(): QueueSendMessageIntegrationResponse {
      return {
        queueName: 'queue',
      };
    }

    @Delete({
      integration: 'queue',
      action: 'SendMessage',
    })
    sendMessageWithResource(
      @IntegrationOptions() { getResourceValue }: QueueIntegrationOption
    ): QueueSendMessageIntegrationResponse {
      return {
        queueName: getResourceValue('test', 'id'),
      };
    }

    @Get({
      integration: 'queue',
      action: 'SendMessage',
    })
    sendMessageWithEvent(
      @Event(SendMessageEvent) e: SendMessageEvent
    ): QueueSendMessageIntegrationResponse {
      return {
        queueName: 'test',
        attributes: {
          attr: e.attribute1,
        },
      };
    }
  }

  it('should create queue integration', async () => {
    const { restApi, stack } = setupTestingRestApi();

    await initializeMethod(restApi, stack, TestingApi, 'sendMessage');

    const synthesized = Testing.synth(stack);
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'POST',
      passthrough_behavior: 'WHEN_NO_TEMPLATES',
      request_templates: {
        'application/json': 'Action=SendMessage',
      },
      type: 'AWS',
      uri: 'arn:aws:apigateway:${aws_api_gateway_rest_api.testing-api-api.region}:sqs:path/queue',
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
      name: 'sqs-write',
    });

    expect(synthesized).toHaveResourceWithProperties(IamRolePolicy, {
      policy:
        '${jsonencode({"Version" = "2012-10-17", "Statement" = [{"Effect" = "Allow", "Action" = ["sqs:SendMessage"], "Resource" = ["*"]}]})}',
    });
  });

  it('should create queue integration with global resource', async () => {
    const { restApi, stack } = setupTestingRestApi();

    const Queue = alicantoResource.make(SqsQueue);

    const queue = new Queue(stack, 'test');
    queue.isGlobal('queue', 'test');

    await initializeMethod(restApi, stack, TestingApi, 'sendMessageWithResource');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'POST',
      passthrough_behavior: 'WHEN_NO_TEMPLATES',
      request_templates: {
        'application/json': 'Action=SendMessage',
      },
      type: 'AWS',
      uri: 'arn:aws:apigateway:${aws_api_gateway_rest_api.testing-api-api.region}:sqs:path/${aws_sqs_queue.test.id}',
    });
  });

  it('should create queue integration with event props', async () => {
    const { restApi, stack } = setupTestingRestApi();

    await initializeMethod(restApi, stack, TestingApi, 'sendMessageWithEvent');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'POST',
      passthrough_behavior: 'WHEN_NO_TEMPLATES',
      request_templates: {
        'application/json':
          "Action=SendMessage&MessageAttribute.1.Name=attr&MessageAttribute.1.Value.StringValue=$util.urlEncode($input.params('attribute1'))&MessageAttribute.1.Value.DataType=String",
      },

      type: 'AWS',
      uri: 'arn:aws:apigateway:${aws_api_gateway_rest_api.testing-api-api.region}:sqs:path/test',
    });
  });
});
