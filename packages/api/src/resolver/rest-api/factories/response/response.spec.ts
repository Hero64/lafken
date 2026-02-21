import { ApiGatewayIntegration } from '@cdktn/provider-aws/lib/api-gateway-integration';
import { ApiGatewayIntegrationResponse } from '@cdktn/provider-aws/lib/api-gateway-integration-response';
import { ApiGatewayMethod } from '@cdktn/provider-aws/lib/api-gateway-method';
import { ApiGatewayMethodResponse } from '@cdktn/provider-aws/lib/api-gateway-method-response';
import { enableBuildEnvVariable } from '@lafken/common';
import { Testing } from 'cdktn';
import { describe, expect, it } from 'vitest';
import { setupTestingRestApi } from '../../../utils/testing.utils';

describe('Response factory', () => {
  enableBuildEnvVariable();
  it('should create a resource', () => {
    const { restApi, stack } = setupTestingRestApi();

    const method = new ApiGatewayMethod(stack, 'test-method', {
      authorization: 'NONE',
      httpMethod: 'GET',
      resourceId: '',
      restApiId: restApi.id,
    });

    const integration = new ApiGatewayIntegration(stack, 'test-integration', {
      httpMethod: method.httpMethod,
      resourceId: '',
      restApiId: restApi.id,
      type: '',
    });

    restApi.responseFactory.createResponses(
      method,
      integration,
      [
        {
          statusCode: '200',
        },
      ],
      '200'
    );

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodResponse, {
      http_method: '${aws_api_gateway_method.test-method.http_method}',
      status_code: '200',
    });
  });

  it('should create multiple resources', () => {
    const { restApi, stack } = setupTestingRestApi();

    const method = new ApiGatewayMethod(stack, 'test-method', {
      authorization: 'NONE',
      httpMethod: 'GET',
      resourceId: '',
      restApiId: restApi.id,
    });

    const integration = new ApiGatewayIntegration(stack, 'test-integration', {
      httpMethod: method.httpMethod,
      resourceId: '',
      restApiId: restApi.id,
      type: '',
    });

    restApi.responseFactory.createResponses(
      method,
      integration,
      [
        {
          statusCode: '200',
        },
        {
          statusCode: '400',
        },
        {
          statusCode: '500',
        },
      ],
      '200'
    );

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodResponse, {
      http_method: '${aws_api_gateway_method.test-method.http_method}',
      status_code: '200',
    });
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodResponse, {
      http_method: '${aws_api_gateway_method.test-method.http_method}',
      status_code: '400',
    });
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodResponse, {
      http_method: '${aws_api_gateway_method.test-method.http_method}',
      status_code: '500',
    });
  });

  it('should create multiple with properties', () => {
    const { restApi, stack } = setupTestingRestApi();

    const method = new ApiGatewayMethod(stack, 'test-method', {
      authorization: 'NONE',
      httpMethod: 'GET',
      resourceId: '',
      restApiId: restApi.id,
    });

    const integration = new ApiGatewayIntegration(stack, 'test-integration', {
      httpMethod: method.httpMethod,
      resourceId: '',
      restApiId: restApi.id,
      type: '',
    });

    restApi.responseFactory.createResponses(
      method,
      integration,
      [
        {
          statusCode: '200',
          template: 'TEMPLATE',
          integrationParameters: {
            parameter: 'test',
          },
          methodParameters: {
            parameter: true,
          },
          selectionPattern: '*pattern*',
          field: {
            name: 'test',
            destinationName: 'test',
            type: 'Object',
            payload: {
              id: 'test',
              name: 'test',
            },
            properties: [
              {
                destinationName: 'prop',
                name: 'prop',
                type: 'Number',
                validation: { required: true },
              },
            ],
            validation: { required: true },
          },
        },
      ],
      'test'
    );

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodResponse, {
      response_models: {
        'application/json': '${aws_api_gateway_model.testing-api-api_test_CD03EE9D.name}',
      },
      response_parameters: {
        parameter: true,
      },
      status_code: '200',
    });

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegrationResponse, {
      response_parameters: {
        parameter: 'test',
      },
      response_templates: {
        'application/json': 'TEMPLATE',
      },
      selection_pattern: '*pattern*',
      status_code: '200',
    });
  });
});
