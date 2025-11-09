import 'cdktf/lib/testing/adapters/jest';
import { enableBuildEnvVariable } from '@alicanto/common';
import { alicantoResource } from '@alicanto/resolver';
import { ApiGatewayIntegration } from '@cdktf/provider-aws/lib/api-gateway-integration';
import { ApiGatewayIntegrationResponse } from '@cdktf/provider-aws/lib/api-gateway-integration-response';
import { ApiGatewayMethodResponse } from '@cdktf/provider-aws/lib/api-gateway-method-response';
import { ApiGatewayModel } from '@cdktf/provider-aws/lib/api-gateway-model';
import { IamRole } from '@cdktf/provider-aws/lib/iam-role';
import { IamRolePolicy } from '@cdktf/provider-aws/lib/iam-role-policy';
import { SfnStateMachine } from '@cdktf/provider-aws/lib/sfn-state-machine';
import { Testing } from 'cdktf';
import {
  Api,
  Event,
  IntegrationOptions,
  Param,
  Payload,
  Post,
  type StateMachineIntegrationOption,
  type StateMachineStartIntegrationResponse,
} from '../../../../../../../main';
import {
  initializeMethod,
  setupTestingRestApi,
} from '../../../../../../utils/testing.utils';

describe('State machine start integration', () => {
  enableBuildEnvVariable();

  @Payload()
  class Data {
    @Param({
      source: 'body',
    })
    foo: string;

    @Param({
      source: 'body',
      type: [Number],
    })
    ids: number[];

    @Param({
      source: 'path',
    })
    name: string;
  }

  @Api()
  class StateMachineIntegrationApi {
    @Post({
      integration: 'state-machine',
      action: 'Start',
      path: 'start',
    })
    start(): StateMachineStartIntegrationResponse {
      return {
        input: {
          name: 'test',
        },
        stateMachineArn: 'arn',
      };
    }

    @Post({
      integration: 'state-machine',
      action: 'Start',
      path: 'start',
    })
    startWithResource(
      @IntegrationOptions() { getResourceValue }: StateMachineIntegrationOption
    ): StateMachineStartIntegrationResponse {
      return {
        input: {
          name: 'test',
        },
        stateMachineArn: getResourceValue('test', 'arn'),
      };
    }

    @Post({
      path: 'start/{name}',
      integration: 'state-machine',
      action: 'Start',
    })
    startEvent(@Event(Data) e: Data): StateMachineStartIntegrationResponse {
      return {
        stateMachineArn: e.name,
        input: {
          foo: e.foo,
          ids: e.ids,
        },
      };
    }
  }

  it('should create state machine integration', async () => {
    const { restApi, stack } = setupTestingRestApi();

    await initializeMethod(restApi, stack, StateMachineIntegrationApi, 'start');

    const synthesized = Testing.synth(stack);
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'POST',
      passthrough_behavior: 'WHEN_NO_TEMPLATES',
      type: 'AWS',
      request_templates: {
        'application/json':
          '{"input": "{ \\"name\\": \\"$util.escapeJavaScript(\'test\')\\" }","stateMachineArn": "arn"}',
      },
      uri: 'arn:aws:apigateway:${aws_api_gateway_rest_api.testing-api-api.region}:states:action/StartExecution',
    });
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodResponse, {
      status_code: '201',
    });

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayModel, {
      schema:
        '${jsonencode({"type" = "object", "required" = ["startDate", "executionId"], "properties" = {"startDate" = {"type" = "string"}, "executionId" = {"type" = "string"}}})}',
    });

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegrationResponse, {
      response_templates: {
        'application/json':
          '#set($startDate = $input.path(\'$.startDate\')) #set($executionArn = $input.path(\'$.executionArn\')) #set($executionId = $executionArn.split(\':\')[6]) #set($id = $executionId.split(\'/\')[1]) { "startDate": "$startDate", "executionId": "$id" }',
      },
      status_code: '201',
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
      name: 'state_machine-write',
    });

    expect(synthesized).toHaveResourceWithProperties(IamRolePolicy, {
      policy:
        '${jsonencode({"Version" = "2012-10-17", "Statement" = [{"Effect" = "Allow", "Action" = ["states:StopExecution", "states:StartExecution"], "Resource" = ["*"]}]})}',
    });
  });

  it('should create state machine integration with global resource', async () => {
    const { restApi, stack } = setupTestingRestApi();

    const StateMachine = alicantoResource.make(SfnStateMachine);

    const stateMachine = new StateMachine(stack, 'test', {
      definition: '',
      roleArn: '',
    });
    stateMachine.isGlobal('state-machine', 'test');

    await initializeMethod(
      restApi,
      stack,
      StateMachineIntegrationApi,
      'startWithResource'
    );

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'POST',
      type: 'AWS',
      request_templates: {
        'application/json':
          '{"input": "{ \\"name\\": \\"$util.escapeJavaScript(\'test\')\\" }","stateMachineArn": "${aws_sfn_state_machine.test.arn}"}',
      },
    });
  });

  it('should create state machine integration with event props', async () => {
    const { restApi, stack } = setupTestingRestApi();

    await initializeMethod(restApi, stack, StateMachineIntegrationApi, 'startEvent');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'POST',
      type: 'AWS',
      request_templates: {
        'application/json':
          '{"input": "{ \\"foo\\": $util.escapeJavaScript($input.json(\'$.foo\')),\\"ids\\": [#foreach($item0 in $input.json(\'$.ids\')) $item0 #if($foreach.hasNext),#end #end] }","stateMachineArn": "$input.params().path.get(\'name\')"}',
      },
    });
  });
});
