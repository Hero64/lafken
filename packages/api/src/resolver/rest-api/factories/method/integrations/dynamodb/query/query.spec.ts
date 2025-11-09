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
  type DynamoQueryIntegrationResponse,
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

describe('Dynamo query integration', () => {
  enableBuildEnvVariable();

  @Payload()
  class Query {
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
      action: 'Query',
    })
    query(): DynamoQueryIntegrationResponse {
      return {
        partitionKey: {
          name: 'foo',
        },
        sortKey: {
          age: 10,
        },
        tableName: 'test',
      };
    }

    @Get({
      integration: 'dynamodb',
      action: 'Query',
    })
    queryWithResource(
      @IntegrationOptions() { getResourceValue }: DynamoIntegrationOption
    ): DynamoQueryIntegrationResponse {
      return {
        partitionKey: {
          name: 'foo',
        },
        tableName: getResourceValue('test', 'id'),
      };
    }

    @Get({
      integration: 'dynamodb',
      action: 'Query',
      path: '/{id}',
    })
    queryEvent(@Event(Query) e: Query): DynamoQueryIntegrationResponse {
      return {
        partitionKey: {
          name: e.id,
        },
        sortKey: {
          age: e.age,
        },
        tableName: 'test',
      };
    }
  }

  it('should create dynamodb integration', async () => {
    const { restApi, stack } = setupTestingRestApi();

    await initializeMethod(restApi, stack, DynamoIntegrationApi, 'query');

    const synthesized = Testing.synth(stack);
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'POST',
      passthrough_behavior: 'WHEN_NO_TEMPLATES',
      type: 'AWS',
      request_templates: {
        'application/json':
          '{"TableName": "test","KeyConditionExpression": "name = :partitionKey && age = :sortKey","ExpressionAttributeValues": { #set($comma = "") $comma":partitionKey": { "S": "foo" } #set($comma = ",")$comma":sortKey": { "N": "10" } #set($comma = ",") }}',
      },
      uri: 'arn:aws:apigateway:${aws_api_gateway_rest_api.testing-api-api.region}:dynamodb:action/Query',
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
      name: 'dynamodb-read',
    });

    expect(synthesized).toHaveResourceWithProperties(IamRolePolicy, {
      policy:
        '${jsonencode({"Version" = "2012-10-17", "Statement" = [{"Effect" = "Allow", "Action" = ["dynamodb:Query", "dynamodb:GetItem", "dynamodb:BatchGetItem"], "Resource" = ["*"]}]})}',
    });
  });

  it('should create dynamodb integration with global resource', async () => {
    const { restApi, stack } = setupTestingRestApi();

    const Table = alicantoResource.make(DynamodbTable);

    const table = new Table(stack, 'test', {
      name: 'test',
    });
    table.isGlobal('dynamo', 'test');

    await initializeMethod(restApi, stack, DynamoIntegrationApi, 'queryWithResource');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'POST',
      type: 'AWS',
      request_templates: {
        'application/json':
          '{"TableName": "${aws_dynamodb_table.test.id}","KeyConditionExpression": "name = :partitionKey","ExpressionAttributeValues": { #set($comma = "") $comma":partitionKey": { "S": "foo" } #set($comma = ",") }}',
      },
    });
  });

  it('should create dynamo integration with event props', async () => {
    const { restApi, stack } = setupTestingRestApi();

    await initializeMethod(restApi, stack, DynamoIntegrationApi, 'queryEvent');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'POST',
      type: 'AWS',
      request_templates: {
        'application/json':
          '{"TableName": "test","KeyConditionExpression": "name = :partitionKey && age = :sortKey","ExpressionAttributeValues": { #set($comma = "") $comma":partitionKey": { "S": $input.json(\'$.id\') } #set($comma = ",")$comma":sortKey": { "N": "$input.json(\'$.age\')" } #set($comma = ",") }}',
      },
    });
  });
});
