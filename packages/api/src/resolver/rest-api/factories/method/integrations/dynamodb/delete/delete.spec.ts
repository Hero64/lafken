import 'cdktn/lib/testing/adapters/jest';
import { ApiGatewayIntegration } from '@cdktn/provider-aws/lib/api-gateway-integration';
import { ApiGatewayIntegrationResponse } from '@cdktn/provider-aws/lib/api-gateway-integration-response';
import { ApiGatewayMethodResponse } from '@cdktn/provider-aws/lib/api-gateway-method-response';
import { DynamodbTable } from '@cdktn/provider-aws/lib/dynamodb-table';
import { IamRole } from '@cdktn/provider-aws/lib/iam-role';
import { IamRolePolicy } from '@cdktn/provider-aws/lib/iam-role-policy';
import { enableBuildEnvVariable } from '@lafken/common';
import { lafkenResource } from '@lafken/resolver';
import { Testing } from 'cdktn';
import {
  Api,
  Delete,
  type DynamoDeleteIntegrationResponse,
  type DynamoIntegrationOption,
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

describe('Dynamo delete integration', () => {
  enableBuildEnvVariable();

  @Payload()
  class DeleteEvent {
    @Param({
      source: 'path',
    })
    id: string;
  }

  @Api()
  class DynamoIntegrationApi {
    @Delete({
      integration: 'dynamodb',
      action: 'Delete',
    })
    delete(): DynamoDeleteIntegrationResponse {
      return {
        partitionKey: {
          name: 'foo',
        },
        sortKey: {
          age: 30,
        },
        tableName: 'test',
      };
    }

    @Delete({
      integration: 'dynamodb',
      action: 'Delete',
    })
    deleteWithResource(
      @IntegrationOptions() { getResourceValue }: DynamoIntegrationOption
    ): DynamoDeleteIntegrationResponse {
      return {
        partitionKey: {
          name: 'foo',
        },
        sortKey: {
          age: 30,
        },
        tableName: getResourceValue('test', 'id'),
      };
    }

    @Get({
      integration: 'dynamodb',
      action: 'Delete',
      path: '/{id}',
    })
    deleteEvent(@Event(DeleteEvent) e: DeleteEvent): DynamoDeleteIntegrationResponse {
      return {
        partitionKey: {
          name: e.id,
        },
        tableName: 'test',
      };
    }
  }

  it('should create dynamodb integration', async () => {
    const { restApi, stack } = setupTestingRestApi();

    await initializeMethod(restApi, stack, DynamoIntegrationApi, 'delete');

    const synthesized = Testing.synth(stack);
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'POST',
      passthrough_behavior: 'WHEN_NO_TEMPLATES',
      type: 'AWS',
      request_templates: {
        'application/json':
          '{"TableName": "test","Key": { "name": { "S": "foo" },"age": { "N": "30" } }}',
      },
      uri: 'arn:aws:apigateway:${aws_api_gateway_rest_api.testing-api-api.region}:dynamodb:action/DeleteItem',
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
      name: 'dynamodb-delete',
    });

    expect(synthesized).toHaveResourceWithProperties(IamRolePolicy, {
      policy:
        '${jsonencode({"Version" = "2012-10-17", "Statement" = [{"Effect" = "Allow", "Action" = ["dynamodb:DeleteItem"], "Resource" = ["*"]}]})}',
    });
  });

  it('should create dynamodb integration with global resource', async () => {
    const { restApi, stack } = setupTestingRestApi();

    const Table = lafkenResource.make(DynamodbTable);

    const table = new Table(stack, 'test', {
      name: 'test',
    });
    table.isGlobal('dynamo', 'test');

    await initializeMethod(restApi, stack, DynamoIntegrationApi, 'deleteWithResource');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'POST',
      type: 'AWS',
      request_templates: {
        'application/json':
          '{"TableName": "${aws_dynamodb_table.test.id}","Key": { "name": { "S": "foo" },"age": { "N": "30" } }}',
      },
    });
  });

  it('should create dynamo integration with event props', async () => {
    const { restApi, stack } = setupTestingRestApi();

    await initializeMethod(restApi, stack, DynamoIntegrationApi, 'deleteEvent');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      integration_http_method: 'POST',
      type: 'AWS',
      request_templates: {
        'application/json':
          '{"TableName": "test","Key": { "name": { "S": "$input.params().path.get(\'id\')" } }}',
      },
    });
  });
});
