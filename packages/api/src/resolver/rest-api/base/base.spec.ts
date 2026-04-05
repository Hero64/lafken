import { ApiGatewayGatewayResponse } from '@cdktn/provider-aws/lib/api-gateway-gateway-response';
import { ApiGatewayStage } from '@cdktn/provider-aws/lib/api-gateway-stage';
import { CloudwatchLogGroup } from '@cdktn/provider-aws/lib/cloudwatch-log-group';
import { DataAwsRegion } from '@cdktn/provider-aws/lib/data-aws-region';
import { Testing } from 'cdktn';
import { describe, expect, it } from 'vitest';
import { setupInternalTestingRestApi } from '../../utils/testing.utils';
import type { InternalRestApi } from '../internal/internal';
import { logFormatValues } from './base.utils';

const addDummyMethodResource = (restApi: InternalRestApi) => {
  const dummy = new DataAwsRegion(restApi, 'dummy-method-resource');
  restApi._methodFactory.resources.push(dummy as any);
};

describe('RestApiBase - addApiGatewayResponse', () => {
  it('should not create any gateway response when defaultResponses is not provided', () => {
    const { stack } = setupInternalTestingRestApi({});
    const synthesized = Testing.synth(stack);

    expect(synthesized).not.toHaveResource(ApiGatewayGatewayResponse);
  });

  it('should create a gateway response for a single response type', () => {
    const { stack } = setupInternalTestingRestApi({
      defaultResponses: {
        unauthorized: { message: 'Unauthorized' },
      },
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayGatewayResponse, {
      response_type: 'UNAUTHORIZED',
      status_code: '401',
      response_templates: {
        'application/json': JSON.stringify({ message: 'Unauthorized' }),
      },
    });
  });

  it('should create multiple gateway responses for multiple response types', () => {
    const { stack } = setupInternalTestingRestApi({
      defaultResponses: {
        unauthorized: { message: 'Unauthorized' },
        badRequestBody: { message: 'Bad Request' },
      },
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayGatewayResponse, {
      response_type: 'UNAUTHORIZED',
      status_code: '401',
      response_templates: {
        'application/json': JSON.stringify({ message: 'Unauthorized' }),
      },
    });
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayGatewayResponse, {
      response_type: 'BAD_REQUEST_BODY',
      status_code: '400',
      response_templates: {
        'application/json': JSON.stringify({ message: 'Bad Request' }),
      },
    });
  });

  it('should skip response types with falsy values', () => {
    const { stack } = setupInternalTestingRestApi({
      defaultResponses: {
        unauthorized: { message: 'Unauthorized' },
        badRequestBody: undefined as any,
      },
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayGatewayResponse, {
      response_type: 'UNAUTHORIZED',
    });
    expect(synthesized).not.toHaveResourceWithProperties(ApiGatewayGatewayResponse, {
      response_type: 'BAD_REQUEST_BODY',
    });
  });

  it('should create a gateway response without status code for default4xx type', () => {
    const { stack } = setupInternalTestingRestApi({
      defaultResponses: {
        default4xx: { message: 'Client Error' },
      },
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayGatewayResponse, {
      response_type: 'DEFAULT_4XX',
      response_templates: {
        'application/json': JSON.stringify({ message: 'Client Error' }),
      },
    });
  });
});

describe('RestApiBase - createStageDeployment access logs', () => {
  it('should create a CloudwatchLogGroup when accessLogSettings is provided', () => {
    const { restApi, stack } = setupInternalTestingRestApi({
      stages: [
        {
          stageName: 'api',
          accessLogSettings: {
            logGroupName: '/aws/apigateway/test-logs',
            formatKeys: ['requestId', 'httpMethod', 'status'],
          },
        },
      ],
    });

    addDummyMethodResource(restApi);
    restApi.createStageDeployment();

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(CloudwatchLogGroup, {
      name: '/aws/apigateway/test-logs',
    });
  });

  it('should create ApiGatewayStage with access log settings format', () => {
    const { restApi, stack } = setupInternalTestingRestApi({
      stages: [
        {
          stageName: 'api',
          accessLogSettings: {
            logGroupName: '/aws/apigateway/test-logs',
            formatKeys: ['requestId', 'httpMethod', 'status'],
          },
        },
      ],
    });

    addDummyMethodResource(restApi);
    restApi.createStageDeployment();

    const synthesized = Testing.synth(stack);
    const parsed = JSON.parse(synthesized);
    const stages = parsed.resource.aws_api_gateway_stage;
    const stage = Object.values(stages)[0] as any;

    expect(stage.stage_name).toBe('api');
    expect(stage.access_log_settings.destination_arn).toContain('cloudwatch_log_group');
    expect(stage.access_log_settings.format).toBe(
      JSON.stringify({
        requestId: logFormatValues.requestId,
        httpMethod: logFormatValues.httpMethod,
        status: logFormatValues.status,
      })
    );
  });

  it('should not create CloudwatchLogGroup when accessLogSettings is not provided', () => {
    const { restApi, stack } = setupInternalTestingRestApi({
      stages: [{ stageName: 'api' }],
    });

    addDummyMethodResource(restApi);
    restApi.createStageDeployment();

    const synthesized = Testing.synth(stack);

    expect(synthesized).not.toHaveResource(CloudwatchLogGroup);
  });

  it('should create ApiGatewayStage without access log settings when not provided', () => {
    const { restApi, stack } = setupInternalTestingRestApi({
      stages: [{ stageName: 'api' }],
    });

    addDummyMethodResource(restApi);
    restApi.createStageDeployment();

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayStage, {
      stage_name: 'api',
    });
    expect(synthesized).not.toHaveResourceWithProperties(ApiGatewayStage, {
      access_log_settings: expect.anything(),
    });
  });

  it('should use all specified format keys in access log format', () => {
    const allKeys = [
      'requestId',
      'extendedRequestId',
      'ip',
      'caller',
      'user',
      'requestTime',
      'httpMethod',
      'resourcePath',
      'status',
      'protocol',
      'responseLength',
    ] as const;

    const { restApi, stack } = setupInternalTestingRestApi({
      stages: [
        {
          stageName: 'api',
          accessLogSettings: {
            logGroupName: '/aws/apigateway/full-logs',
            formatKeys: [...allKeys],
          },
        },
      ],
    });

    addDummyMethodResource(restApi);
    restApi.createStageDeployment();

    const synthesized = Testing.synth(stack);

    const expectedFormat: Record<string, string> = {};
    for (const key of allKeys) {
      expectedFormat[key] = logFormatValues[key];
    }

    const parsed = JSON.parse(synthesized);
    const stages = parsed.resource.aws_api_gateway_stage;
    const stage = Object.values(stages)[0] as any;

    expect(stage.access_log_settings.destination_arn).toContain('cloudwatch_log_group');
    expect(stage.access_log_settings.format).toBe(JSON.stringify(expectedFormat));
  });
});
