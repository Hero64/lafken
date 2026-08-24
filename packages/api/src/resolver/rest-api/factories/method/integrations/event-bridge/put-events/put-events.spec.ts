import { ApiGatewayIntegration } from '@cdktn/provider-aws/lib/api-gateway-integration';
import { ApiGatewayIntegrationResponse } from '@cdktn/provider-aws/lib/api-gateway-integration-response';
import { ApiGatewayMethodResponse } from '@cdktn/provider-aws/lib/api-gateway-method-response';
import { CloudwatchEventBus } from '@cdktn/provider-aws/lib/cloudwatch-event-bus';
import { IamRole } from '@cdktn/provider-aws/lib/iam-role';
import { IamRolePolicy } from '@cdktn/provider-aws/lib/iam-role-policy';
import { enableBuildEnvVariable } from '@lafken/common';
import { lafkenResource } from '@lafken/resolver';
import { Testing } from 'cdktn';
import { describe, expect, it } from 'vitest';
import {
  Api,
  ApiRequest,
  BodyParam,
  Event,
  type EventBridgeIntegrationOption,
  type EventBridgePutEventsIntegrationResponse,
  IntegrationOptions,
  Post,
} from '../../../../../../../main';
import {
  initializeMethod,
  setupInternalTestingRestApi,
} from '../../../../../../utils/testing.utils';

describe('EventBridge put events integration', () => {
  enableBuildEnvVariable();

  @ApiRequest()
  class OrderEvent {
    @BodyParam()
    orderId: string;

    @BodyParam({
      type: [Number],
    })
    items: number[];
  }

  @Api()
  class TestingApi {
    @Post({
      integration: 'event-bridge',
      action: 'PutEvents',
    })
    publish(): EventBridgePutEventsIntegrationResponse {
      return {
        eventBusName: 'orders-bus',
        source: 'orders',
        detailType: 'OrderCreated',
        detail: { orderId: '123', items: 2 },
      };
    }

    @Post({
      integration: 'event-bridge',
      action: 'PutEvents',
    })
    publishWithResource(
      @IntegrationOptions() { getResourceValue }: EventBridgeIntegrationOption
    ): EventBridgePutEventsIntegrationResponse {
      return {
        eventBusName: getResourceValue('event-bus::test', 'id'),
        source: 'orders',
        detailType: 'OrderCreated',
        detail: { orderId: '123' },
      };
    }

    @Post({
      integration: 'event-bridge',
      action: 'PutEvents',
    })
    publishWithEvent(
      @Event(OrderEvent) e: OrderEvent
    ): EventBridgePutEventsIntegrationResponse {
      return {
        eventBusName: 'orders-bus',
        source: 'orders',
        detailType: 'OrderCreated',
        detail: { orderId: e.orderId, items: e.items },
      };
    }
  }

  it('should create eventbridge put events integration', async () => {
    const { restApi, stack } = setupInternalTestingRestApi();

    await initializeMethod(restApi, stack, TestingApi, 'publish');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'POST',
      passthrough_behavior: 'WHEN_NO_TEMPLATES',
      request_parameters: {
        'integration.request.header.Content-Type': "'application/x-amz-json-1.1'",
        'integration.request.header.X-Amz-Target': "'AWSEvents.PutEvents'",
      },
      request_templates: {
        'application/json':
          '{ "Entries": [{ "Source": "orders", "DetailType": "OrderCreated", "Detail": "{ #set($comma = "") $comma\\"orderId\\": \\"$util.escapeJavaScript(\'123\')\\" #set($comma = ",")$comma\\"items\\": 2 #set($comma = ",") }", "EventBusName": "orders-bus" }] }',
      },
      type: 'AWS',
      uri: 'arn:aws:apigateway:${aws_api_gateway_rest_api.testing-api-api.region}:events:action/PutEvents',
    });

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodResponse, {
      status_code: '201',
    });

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegrationResponse, {
      status_code: '201',
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
      name: 'TestingApi-publish-integration',
    });

    expect(synthesized).toHaveResourceWithProperties(IamRolePolicy, {
      policy:
        '${jsonencode({"Version" = "2012-10-17", "Statement" = [{"Effect" = "Allow", "Action" = ["events:PutEvents"], "Resource" = ["*"]}]})}',
    });
  });

  it('should create eventbridge put events integration with global resource', async () => {
    const { restApi, stack } = setupInternalTestingRestApi();

    const EventBus = lafkenResource.make(CloudwatchEventBus);
    const eventBus = new EventBus(stack, 'test', { name: 'test-bus' });
    eventBus.register('event-bus', 'test');

    await initializeMethod(restApi, stack, TestingApi, 'publishWithResource');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'POST',
      passthrough_behavior: 'WHEN_NO_TEMPLATES',
      request_templates: {
        'application/json':
          '{ "Entries": [{ "Source": "orders", "DetailType": "OrderCreated", "Detail": "{ #set($comma = "") $comma\\"orderId\\": \\"$util.escapeJavaScript(\'123\')\\" #set($comma = ",") }", "EventBusName": "${aws_cloudwatch_event_bus.test.id}" }] }',
      },
      type: 'AWS',
      uri: 'arn:aws:apigateway:${aws_api_gateway_rest_api.testing-api-api.region}:events:action/PutEvents',
    });
  });

  it('should create eventbridge put events integration with event params', async () => {
    const { restApi, stack } = setupInternalTestingRestApi();

    await initializeMethod(restApi, stack, TestingApi, 'publishWithEvent');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'POST',
      passthrough_behavior: 'WHEN_NO_TEMPLATES',
      request_templates: {
        'application/json':
          '{ "Entries": [{ "Source": "orders", "DetailType": "OrderCreated", "Detail": "{ #set($comma = "") $comma\\"orderId\\": \\"$util.escapeJavaScript($input.path(\'$.orderId\'))\\" #set($comma = ",")$comma\\"items\\": $input.json(\'$.items\') #set($comma = ",") }", "EventBusName": "orders-bus" }] }',
      },
      type: 'AWS',
      uri: 'arn:aws:apigateway:${aws_api_gateway_rest_api.testing-api-api.region}:events:action/PutEvents',
    });
  });
});
