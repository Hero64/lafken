import { ApiGatewayIntegration } from '@cdktn/provider-aws/lib/api-gateway-integration';
import { ApiGatewayIntegrationResponse } from '@cdktn/provider-aws/lib/api-gateway-integration-response';
import { ApiGatewayMethodResponse } from '@cdktn/provider-aws/lib/api-gateway-method-response';
import { IamRole } from '@cdktn/provider-aws/lib/iam-role';
import { IamRolePolicy } from '@cdktn/provider-aws/lib/iam-role-policy';
import { SqsQueue } from '@cdktn/provider-aws/lib/sqs-queue';
import { enableBuildEnvVariable } from '@lafken/common';
import { lafkenResource } from '@lafken/resolver';
import { Testing } from 'cdktn';
import { describe, expect, it } from 'vitest';
import {
  Api,
  ApiRequest,
  ApiResponse,
  BodyParam,
  Delete,
  Event,
  Get,
  IntegrationOptions,
  PathParam,
  Post,
  QueryParam,
  type QueueIntegrationOption,
  type QueueSendMessageIntegrationResponse,
  ResField,
} from '../../../../../../../main';
import {
  initializeMethod,
  setupInternalTestingRestApi,
} from '../../../../../../utils/testing.utils';

describe('Queue send message integration', () => {
  enableBuildEnvVariable();

  @ApiRequest()
  class SendMessageEvent {
    @QueryParam()
    attribute1: string;
  }

  @ApiRequest()
  class PokemonDetail {
    @BodyParam()
    color: string;

    @BodyParam()
    weight: number;
  }

  @ApiRequest()
  class SendMessageBodyEvent {
    @PathParam()
    name: string;

    @QueryParam()
    trainer: string;

    @BodyParam()
    level: number;

    @BodyParam({ type: [String] })
    types: string[];

    @BodyParam({ type: PokemonDetail })
    detail: PokemonDetail;
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
        queueName: getResourceValue('testing::test', 'id'),
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

    @Post({
      path: 'pokemon/{name}',
      integration: 'queue',
      action: 'SendMessage',
    })
    sendMessageWithObjectBody(
      @Event(SendMessageBodyEvent) e: SendMessageBodyEvent
    ): QueueSendMessageIntegrationResponse {
      return {
        queueName: 'test',
        body: {
          name: e.name,
          trainer: e.trainer,
          level: e.level,
          types: e.types,
          color: e.detail.color,
          detail: e.detail,
          source: 'pokedex api',
          captured: true,
        },
      };
    }

    @Post({
      integration: 'queue',
      action: 'SendMessage',
    })
    sendMessageWithResourceBody(
      @IntegrationOptions() { getResourceValue }: QueueIntegrationOption
    ): QueueSendMessageIntegrationResponse {
      return {
        queueName: 'test',
        body: {
          queue: getResourceValue('testing::test', 'name'),
        },
      };
    }

    @Post({
      integration: 'queue',
      action: 'SendMessage',
    })
    sendMessageWithStaticBody(): QueueSendMessageIntegrationResponse {
      return {
        queueName: 'test',
        body: {
          type: 'welcome',
          attempts: 3,
          tags: ['a', 'b'],
        },
      };
    }
  }

  it('should create queue integration', async () => {
    const { restApi, stack } = setupInternalTestingRestApi();

    await initializeMethod(restApi, stack, TestingApi, 'sendMessage');

    const synthesized = Testing.synth(stack);
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'POST',
      passthrough_behavior: 'WHEN_NO_TEMPLATES',
      request_templates: {
        'application/json': 'Action=SendMessage',
      },
      type: 'AWS',
      uri: 'arn:aws:apigateway:${aws_api_gateway_rest_api.testing-api-api.region}:sqs:path/${data.aws_caller_identity.TestingApi-sendMessage-identity.account_id}/queue',
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
      name: 'TestingApi-sendMessage-integration',
    });

    expect(synthesized).toHaveResourceWithProperties(IamRolePolicy, {
      policy:
        '${jsonencode({"Version" = "2012-10-17", "Statement" = [{"Effect" = "Allow", "Action" = ["sqs:SendMessage"], "Resource" = ["*"]}]})}',
    });
  });

  it('should create queue integration with global resource', async () => {
    const { restApi, stack } = setupInternalTestingRestApi();

    const Queue = lafkenResource.make(SqsQueue);

    const queue = new Queue(stack, 'test');
    queue.register('testing', 'test');

    await initializeMethod(restApi, stack, TestingApi, 'sendMessageWithResource');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'POST',
      passthrough_behavior: 'WHEN_NO_TEMPLATES',
      request_templates: {
        'application/json': 'Action=SendMessage',
      },
      type: 'AWS',
      uri: 'arn:aws:apigateway:${aws_api_gateway_rest_api.testing-api-api.region}:sqs:path/${data.aws_caller_identity.TestingApi-sendMessageWithResource-identity.account_id}/${aws_sqs_queue.test.id}',
    });
  });

  it('should create queue integration with event props', async () => {
    const { restApi, stack } = setupInternalTestingRestApi();

    await initializeMethod(restApi, stack, TestingApi, 'sendMessageWithEvent');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'POST',
      passthrough_behavior: 'WHEN_NO_TEMPLATES',
      request_parameters: {
        'integration.request.header.Content-Type': "'application/x-www-form-urlencoded'",
      },
      request_templates: {
        'application/json':
          "Action=SendMessage&MessageAttribute.1.Name=attr&MessageAttribute.1.Value.StringValue=$util.urlEncode($input.params('attribute1'))&MessageAttribute.1.Value.DataType=String",
      },
      type: 'AWS',
      uri: 'arn:aws:apigateway:${aws_api_gateway_rest_api.testing-api-api.region}:sqs:path/${data.aws_caller_identity.TestingApi-sendMessageWithEvent-identity.account_id}/test',
    });
  });

  it('should create queue integration with an object body', async () => {
    const { restApi, stack } = setupInternalTestingRestApi();

    await initializeMethod(restApi, stack, TestingApi, 'sendMessageWithObjectBody');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      request_parameters: {
        'integration.request.header.Content-Type': "'application/x-www-form-urlencoded'",
      },
      request_templates: {
        'application/json': [
          'Action=SendMessage&MessageBody={ #set($comma = "") ',
          `$comma""name"": ""$util.urlEncode($input.params().path.get('name'))"" #set($comma = ",")`,
          `$comma""trainer"": ""$util.urlEncode($input.params('trainer'))"" #set($comma = ",")`,
          `$comma""level"": $input.path('$.level') #set($comma = ",")`,
          `$comma""types"": $util.urlEncode($input.json('$.types')) #set($comma = ",")`,
          `$comma""color"": ""$util.urlEncode($input.path('$.detail.color'))"" #set($comma = ",")`,
          `$comma""detail"": { #set($comma = "") `,
          `$comma""color"": ""$util.urlEncode($input.path('$.detail.color'))"" #set($comma = ",")`,
          `$comma""weight"": $input.path('$.detail.weight') #set($comma = ",") } #set($comma = ",")`,
          `$comma""source"": ""$util.urlEncode('pokedex api')"" #set($comma = ",")`,
          `$comma""captured"": true #set($comma = ",") }`,
        ].join(''),
      },
    });
  });

  it('should keep the resource reference of an object body value', async () => {
    const { restApi, stack } = setupInternalTestingRestApi();

    const Queue = lafkenResource.make(SqsQueue);

    const queue = new Queue(stack, 'test');
    queue.register('testing', 'test');

    await initializeMethod(restApi, stack, TestingApi, 'sendMessageWithResourceBody');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      request_templates: {
        'application/json': [
          'Action=SendMessage&MessageBody={ #set($comma = "") ',
          `$comma""queue"": ""$util.urlEncode('\${aws_sqs_queue.test.name}')"" #set($comma = ",") }`,
        ].join(''),
      },
    });
  });

  it('should create queue integration with a static object body', async () => {
    const { restApi, stack } = setupInternalTestingRestApi();

    await initializeMethod(restApi, stack, TestingApi, 'sendMessageWithStaticBody');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      request_templates: {
        'application/json': [
          'Action=SendMessage&MessageBody={ #set($comma = "") ',
          `$comma""type"": ""$util.urlEncode('welcome')"" #set($comma = ",")`,
          `$comma""attempts"": 3 #set($comma = ",")`,
          `$comma""tags"": [""$util.urlEncode('a')"",""$util.urlEncode('b')""] #set($comma = ",") }`,
        ].join(''),
      },
    });
  });

  describe('response template generation', () => {
    @ApiResponse()
    class MessageResult {
      @ResField()
      messageId: string;

      @ResField()
      sequenceNumber: string;
    }

    @ApiResponse()
    class CustomTemplateResult {
      @ResField({
        template: "$input.path('$.SendMessageResponse.SendMessageResult.MessageId')",
      })
      messageId: string;

      @ResField()
      requestId: string;
    }

    @Api()
    class ResponseApi {
      @Get({
        integration: 'queue',
        action: 'SendMessage',
        response: MessageResult,
      })
      sendWithResponse(): QueueSendMessageIntegrationResponse {
        return { queueName: 'my-queue' };
      }

      @Get({
        integration: 'queue',
        action: 'SendMessage',
        response: CustomTemplateResult,
      })
      sendWithCustomTemplate(): QueueSendMessageIntegrationResponse {
        return { queueName: 'my-queue' };
      }
    }

    it('should set response_templates on the success integration response using field names', async () => {
      const { restApi, stack } = setupInternalTestingRestApi();

      await initializeMethod(restApi, stack, ResponseApi, 'sendWithResponse');

      const synthesized = Testing.synth(stack);

      expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegrationResponse, {
        status_code: '200',
        response_templates: {
          'application/json': `{ #set($comma = "") $comma"messageId": "$input.path('$.messageId')" #set($comma = ",")$comma"sequenceNumber": "$input.path('$.sequenceNumber')" #set($comma = ",") }`,
        },
      });
    });

    it('should use field.template when set and fall back to $input.path for others', async () => {
      const { restApi, stack } = setupInternalTestingRestApi();

      await initializeMethod(restApi, stack, ResponseApi, 'sendWithCustomTemplate');

      const synthesized = Testing.synth(stack);

      expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegrationResponse, {
        status_code: '200',
        response_templates: {
          'application/json': `{ #set($comma = "") $comma"messageId": "$input.path('$.SendMessageResponse.SendMessageResult.MessageId')" #set($comma = ",")$comma"requestId": "$input.path('$.requestId')" #set($comma = ",") }`,
        },
      });
    });
  });
});
