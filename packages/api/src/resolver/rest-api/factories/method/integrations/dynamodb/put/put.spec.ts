import 'cdktf/lib/testing/adapters/jest';
import { enableBuildEnvVariable } from '@alicanto/common';
import { alicantoResource } from '@alicanto/resolver';
import { ApiGatewayIntegration } from '@cdktf/provider-aws/lib/api-gateway-integration';
import { ApiGatewayIntegrationResponse } from '@cdktf/provider-aws/lib/api-gateway-integration-response';
import { ApiGatewayMethodResponse } from '@cdktf/provider-aws/lib/api-gateway-method-response';
import { DynamodbTable } from '@cdktf/provider-aws/lib/dynamodb-table';
import { IamRole } from '@cdktf/provider-aws/lib/iam-role';
import { IamRolePolicy } from '@cdktf/provider-aws/lib/iam-role-policy';
import { Testing } from 'cdktf';
import {
  Api,
  type DynamoIntegrationOption,
  type DynamoPutIntegrationResponse,
  Event,
  Get,
  IntegrationOptions,
  Param,
  Payload,
} from '../../../../../../../main';
import {
  initializeMethod,
  setupTestingRestApi,
} from '../../../../../../utils/testing.utils';

describe('Dynamo put integration', () => {
  enableBuildEnvVariable();

  @Payload()
  class PutData {
    @Param({
      source: 'path',
    })
    id: string;

    @Param()
    age: number;
  }

  @Api()
  class DynamoIntegrationApi {
    @Get({
      integration: 'dynamodb',
      action: 'Put',
    })
    put(): DynamoPutIntegrationResponse {
      return {
        data: {
          foo: 'bar',
          bar: 'foo',
          list: [1, 2, 3, 4, 5],
          user: {
            name: 'test',
            isAdmin: true,
            address: [
              {
                city: 'springfield',
              },
            ],
          },
        },
        tableName: 'test',
      };
    }

    @Get({
      integration: 'dynamodb',
      action: 'Put',
    })
    putWithResource(
      @IntegrationOptions() { getResourceValue, getCurrentDate }: DynamoIntegrationOption
    ): DynamoPutIntegrationResponse {
      return {
        data: {
          name: 'foo',
          date: getCurrentDate(),
        },
        tableName: getResourceValue('test', 'id'),
      };
    }

    @Get({
      integration: 'dynamodb',
      action: 'Put',
      path: '/{id}',
    })
    putEvent(@Event(PutData) e: PutData): DynamoPutIntegrationResponse {
      return {
        data: e,
        tableName: 'test',
      };
    }
  }

  it('should create dynamodb integration', async () => {
    const { restApi, stack } = setupTestingRestApi();

    await initializeMethod(restApi, stack, DynamoIntegrationApi, 'put');

    const synthesized = Testing.synth(stack);
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'POST',
      passthrough_behavior: 'WHEN_NO_TEMPLATES',
      type: 'AWS',
      request_templates: {
        'application/json':
          '{"TableName": "test","Item": { "foo": { "S": "bar" },"bar": { "S": "foo" },"list": { "L": [{ "N": "1" },{ "N": "2" },{ "N": "3" },{ "N": "4" },{ "N": "5" }] },"user": { "M": { "name": { "S": "test" },"isAdmin": { "BOOL": true },"address": { "L": [{ "M": { "city": { "S": "springfield" } } }] } } } }}',
      },
      uri: 'arn:aws:apigateway:${aws_api_gateway_rest_api.testing-api-api.region}:dynamodb:action/PutItem',
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
      name: 'dynamodb-write',
    });

    expect(synthesized).toHaveResourceWithProperties(IamRolePolicy, {
      policy:
        '${jsonencode({"Version" = "2012-10-17", "Statement" = [{"Effect" = "Allow", "Action" = ["dynamodb:PutItem", "dynamodb:UpdateItem"], "Resource" = ["*"]}]})}',
    });
  });

  it('should create dynamodb integration with global resource', async () => {
    const { restApi, stack } = setupTestingRestApi();

    const Table = alicantoResource.make(DynamodbTable);

    const table = new Table(stack, 'test', {
      name: 'test',
    });
    table.isGlobal('dynamo', 'test');

    await initializeMethod(restApi, stack, DynamoIntegrationApi, 'putWithResource');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'POST',
      type: 'AWS',
      request_templates: {
        'application/json':
          '{"TableName": "${aws_dynamodb_table.test.id}","Item": { "name": { "S": "foo" },"date": { "S": "$context.requestTimeEpoch" } }}',
      },
    });
  });

  it('should create dynamo integration with event props', async () => {
    const { restApi, stack } = setupTestingRestApi();

    await initializeMethod(restApi, stack, DynamoIntegrationApi, 'putEvent');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'POST',
      type: 'AWS',
      request_templates: {
        'application/json':
          '{"TableName": "test","Item": { #set($comma = "") $comma"id": { "S": "$input.params().path.get(\'id\')" } #set($comma = ",")$comma"age": { "N": "$input.params(\'age\')" } #set($comma = ",") }}',
      },
    });
  });
});
