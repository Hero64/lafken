import { ApiGatewayIntegration } from '@cdktn/provider-aws/lib/api-gateway-integration';
import { ApiGatewayIntegrationResponse } from '@cdktn/provider-aws/lib/api-gateway-integration-response';
import { ApiGatewayMethod } from '@cdktn/provider-aws/lib/api-gateway-method';
import { ApiGatewayMethodResponse } from '@cdktn/provider-aws/lib/api-gateway-method-response';
import { enableBuildEnvVariable } from '@lafken/common';
import { Testing } from 'cdktn';
import { describe, expect, it } from 'vitest';
import { setupInternalTestingRestApi } from '../../../utils/testing.utils';

describe('Response factory', () => {
  enableBuildEnvVariable();
  it('should create a resource', () => {
    const { restApi, stack } = setupInternalTestingRestApi();

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
    const { restApi, stack } = setupInternalTestingRestApi();

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

  it('should reference a primitive response model via terraform token', () => {
    const { restApi, stack } = setupInternalTestingRestApi();

    const method = new ApiGatewayMethod(stack, 'test-method', {
      authorization: 'NONE',
      httpMethod: 'PUT',
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
          field: {
            name: 'test',
            destinationName: 'test',
            type: 'Boolean',
          },
        },
      ],
      'PokeApiUpdatePokemon-200'
    );

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodResponse, {
      response_models: {
        'application/json':
          '${aws_api_gateway_model.testing-api-api_PokeApiUpdatePokemon-200-200Model_2244AF2E.name}',
      },
      status_code: '200',
    });
  });

  it('should create multiple with properties', () => {
    const { restApi, stack } = setupInternalTestingRestApi();

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
                required: true,
              },
            ],
            required: true,
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

  it('should add Access-Control-Allow-Origin to a real response when cors is set', () => {
    const { restApi, stack } = setupInternalTestingRestApi();

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
      [{ statusCode: '200' }, { statusCode: '400' }],
      'test',
      { allowOrigins: 'https://example.com' }
    );

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegrationResponse, {
      status_code: '200',
      response_parameters: {
        'method.response.header.Access-Control-Allow-Origin': "'https://example.com'",
        'method.response.header.Vary': "'Origin'",
      },
    });
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegrationResponse, {
      status_code: '400',
      response_parameters: {
        'method.response.header.Access-Control-Allow-Origin': "'https://example.com'",
        'method.response.header.Vary': "'Origin'",
      },
    });
  });

  it('should match the extra origins in the integration response template', () => {
    const { restApi, stack } = setupInternalTestingRestApi();

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
      [{ statusCode: '200' }, { statusCode: '400', template: '{"message": "bad"}' }],
      'test',
      { allowOrigins: ['https://a.com', 'https://b.com'] }
    );

    const synthesized = Testing.synth(stack);

    // No template of its own: the body is forwarded with $input.body.
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegrationResponse, {
      status_code: '200',
      response_parameters: expect.objectContaining({
        'method.response.header.Access-Control-Allow-Origin': "'https://a.com'",
      }),
      response_templates: {
        'application/json': expect.stringContaining('$input.body'),
      },
    });

    // An existing template is kept, with the override prepended.
    const responses =
      JSON.parse(synthesized).resource.aws_api_gateway_integration_response;
    const errorEntry = Object.values(responses).find(
      (entry: any) => entry.status_code === '400'
    ) as any;
    const errorTemplate = errorEntry.response_templates['application/json'];
    expect(errorTemplate).toContain('$origin == "https://b.com"');
    expect(errorTemplate).toContain('{"message": "bad"}');
    expect(errorTemplate).not.toContain('$input.body');
  });

  it('should reject several origins on a response that forwards its body untouched', () => {
    const { restApi, stack } = setupInternalTestingRestApi();

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

    expect(() =>
      restApi.responseFactory.createResponses(
        method,
        integration,
        [{ statusCode: '200', rawBody: true }],
        'test',
        { allowOrigins: ['https://a.com', 'https://b.com'] }
      )
    ).toThrow(/forwards its body untouched/);
  });

  it('should not add cors headers to error responses when addToErrorResponses is false', () => {
    const { restApi, stack } = setupInternalTestingRestApi();

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
      [{ statusCode: '200' }, { statusCode: '500' }],
      'test',
      { allowOrigins: '*', addToErrorResponses: false }
    );

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegrationResponse, {
      status_code: '200',
      response_parameters: {
        'method.response.header.Access-Control-Allow-Origin': "'*'",
      },
    });
    const errorResponse =
      JSON.parse(synthesized).resource.aws_api_gateway_integration_response;
    const errorEntry = Object.values(errorResponse).find(
      (entry: any) => entry.status_code === '500'
    ) as any;
    expect(errorEntry.response_parameters).toBeUndefined();
  });
});

describe('Response factory - openapi mode', () => {
  enableBuildEnvVariable();

  const objectField = {
    name: 'test',
    destinationName: 'test',
    type: 'Object',
    payload: {
      id: 'user-response',
      name: 'user-response',
    },
    properties: [
      {
        destinationName: 'prop',
        name: 'prop',
        type: 'Number',
        required: true,
      },
    ],
    required: true,
  } as const;

  it('should link an object response to its component schema', () => {
    const { restApi } = setupInternalTestingRestApi({ definition: 'openapi' });

    const { operationResponses } = restApi.responseFactory.buildResponseFragments(
      [{ statusCode: '200', field: objectField as any }],
      'test'
    );

    expect(operationResponses['200'].content).toEqual({
      'application/json': {
        schema: { $ref: '#/components/schemas/UserResponse' },
      },
    });
  });

  it('should link an array of objects response to an array component schema', () => {
    const { restApi } = setupInternalTestingRestApi({ definition: 'openapi' });

    const { operationResponses } = restApi.responseFactory.buildResponseFragments(
      [
        {
          statusCode: '200',
          field: {
            name: 'test',
            destinationName: 'test',
            type: 'Array',
            items: objectField,
          } as any,
        },
      ],
      'test'
    );
    restApi.openapiFactory.addOperation('/test', 'get', { responses: {} });

    const document = JSON.parse(restApi.openapiFactory.finalize() as string);

    expect(operationResponses['200'].content).toEqual({
      'application/json': {
        schema: { $ref: '#/components/schemas/Test200Model' },
      },
    });
    expect(document.components.schemas.Test200Model).toEqual({
      type: 'array',
      items: { $ref: '#/components/schemas/UserResponse' },
    });
  });

  it('should reuse the same component schema across operations', () => {
    const { restApi } = setupInternalTestingRestApi({ definition: 'openapi' });

    const first = restApi.responseFactory.buildResponseFragments(
      [{ statusCode: '200', field: objectField as any }],
      'first'
    );
    const second = restApi.responseFactory.buildResponseFragments(
      [{ statusCode: '200', field: objectField as any }],
      'second'
    );
    restApi.openapiFactory.addOperation('/test', 'get', { responses: {} });

    const document = JSON.parse(restApi.openapiFactory.finalize() as string);

    expect(second.operationResponses['200'].content).toEqual(
      first.operationResponses['200'].content
    );
    expect(Object.keys(document.components.schemas)).toEqual(['UserResponse']);
  });

  it('should not add content for a response without a field', () => {
    const { restApi } = setupInternalTestingRestApi({ definition: 'openapi' });

    const { operationResponses, integrationResponses } =
      restApi.responseFactory.buildResponseFragments(
        [{ statusCode: '204', selectionPattern: '2\\d{2}' }],
        'test'
      );

    expect(operationResponses['204'].content).toBeUndefined();
    expect(integrationResponses['2\\d{2}'].statusCode).toBe('204');
  });

  it('should add Access-Control-Allow-Origin to a real response when cors is set', () => {
    const { restApi } = setupInternalTestingRestApi({ definition: 'openapi' });

    const { operationResponses, integrationResponses } =
      restApi.responseFactory.buildResponseFragments(
        [{ statusCode: '200' }, { statusCode: '400', selectionPattern: '.*BAD.*' }],
        'test',
        { allowOrigins: 'https://example.com' }
      );

    expect(operationResponses['200'].headers).toEqual({
      'Access-Control-Allow-Origin': { schema: { type: 'string' } },
      Vary: { schema: { type: 'string' } },
    });
    expect(integrationResponses.default.responseParameters).toEqual({
      'method.response.header.Access-Control-Allow-Origin': "'https://example.com'",
      'method.response.header.Vary': "'Origin'",
    });
    expect(integrationResponses['.*BAD.*'].responseParameters).toEqual({
      'method.response.header.Access-Control-Allow-Origin': "'https://example.com'",
      'method.response.header.Vary': "'Origin'",
    });
  });
});
