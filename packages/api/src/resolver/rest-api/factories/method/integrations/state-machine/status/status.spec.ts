import { ApiGatewayIntegration } from '@cdktn/provider-aws/lib/api-gateway-integration';
import { ApiGatewayIntegrationResponse } from '@cdktn/provider-aws/lib/api-gateway-integration-response';
import { ApiGatewayMethodResponse } from '@cdktn/provider-aws/lib/api-gateway-method-response';
import { IamRole } from '@cdktn/provider-aws/lib/iam-role';
import { IamRolePolicy } from '@cdktn/provider-aws/lib/iam-role-policy';
import { SfnStateMachine } from '@cdktn/provider-aws/lib/sfn-state-machine';
import { enableBuildEnvVariable } from '@lafken/common';
import { lafkenResource } from '@lafken/resolver';
import { Testing } from 'cdktn';
import { describe, expect, it } from 'vitest';
import {
  Api,
  Event,
  Get,
  IntegrationOptions,
  Param,
  Payload,
  type StateMachineIntegrationOption,
  type StateMachineStatusIntegrationResponse,
} from '../../../../../../../main';
import {
  initializeMethod,
  setupTestingRestApi,
} from '../../../../../../utils/testing.utils';

describe('State machine status integration', () => {
  enableBuildEnvVariable();

  @Payload()
  class Status {
    @Param({
      source: 'path',
    })
    id: string;
  }

  @Api()
  class StateMachineIntegrationApi {
    @Get({
      integration: 'state-machine',
      action: 'Status',
      path: 'status',
    })
    status(): StateMachineStatusIntegrationResponse {
      return {
        executionArn: 'arn',
      };
    }

    @Get({
      integration: 'state-machine',
      action: 'Status',
      path: 'status',
    })
    statusWithResource(
      @IntegrationOptions() { getResourceValue }: StateMachineIntegrationOption
    ): StateMachineStatusIntegrationResponse {
      return {
        executionArn: getResourceValue('state-machine::test', 'arn'),
      };
    }

    @Get({
      path: 'status/{id}',
      integration: 'state-machine',
      action: 'Status',
    })
    statusEvent(@Event(Status) e: Status): StateMachineStatusIntegrationResponse {
      return {
        executionArn: e.id,
      };
    }
  }

  it('should create state machine integration', async () => {
    const { restApi, stack } = setupTestingRestApi();

    await initializeMethod(restApi, stack, StateMachineIntegrationApi, 'status');

    const synthesized = Testing.synth(stack);
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'POST',
      passthrough_behavior: 'WHEN_NO_TEMPLATES',
      type: 'AWS',
      request_templates: {
        'application/json': '{ "executionArn": "arn" }',
      },
      uri: 'arn:aws:apigateway:${aws_api_gateway_rest_api.testing-api-api.region}:states:action/DescribeExecution',
    });
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodResponse, {
      status_code: '200',
    });

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegrationResponse, {
      response_templates: {
        'application/json':
          '#set($status = $input.json(\'status\')) { "status": $status }',
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
      name: 'state_machine-read',
    });

    expect(synthesized).toHaveResourceWithProperties(IamRolePolicy, {
      policy:
        '${jsonencode({"Version" = "2012-10-17", "Statement" = [{"Effect" = "Allow", "Action" = ["states:DescribeExecution"], "Resource" = ["*"]}]})}',
    });
  });

  it('should create state machine integration with global resource', async () => {
    const { restApi, stack } = setupTestingRestApi();

    const StateMachine = lafkenResource.make(SfnStateMachine);

    const stateMachine = new StateMachine(stack, 'test', {
      definition: '',
      roleArn: '',
    });
    stateMachine.isGlobal('state-machine', 'test');

    await initializeMethod(
      restApi,
      stack,
      StateMachineIntegrationApi,
      'statusWithResource'
    );

    await lafkenResource.callDependentCallbacks();
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'POST',
      type: 'AWS',
      request_templates: {
        'application/json': '{ "executionArn": "${aws_sfn_state_machine.test.arn}" }',
      },
    });
  });

  it('should create state machine integration with event props', async () => {
    const { restApi, stack } = setupTestingRestApi();

    await initializeMethod(restApi, stack, StateMachineIntegrationApi, 'statusEvent');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'POST',
      type: 'AWS',
      request_templates: {
        'application/json': '{ "executionArn": "$input.params().path.get(\'id\')" }',
      },
    });
  });
});
