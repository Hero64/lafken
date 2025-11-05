import 'cdktf/lib/testing/adapters/jest';
import { enableBuildEnvVariable } from '@alicanto/common';
import { ApiGatewayModel } from '@cdktf/provider-aws/lib/api-gateway-model';
import { Testing } from 'cdktf';
import { setupTestingRestApi } from '../../../utils/testing.utils';

describe('Model factory', () => {
  enableBuildEnvVariable();
  it('should create a new model', () => {
    const { restApi, stack } = setupTestingRestApi();

    restApi.modelFactory.getModel({
      field: {
        destinationName: 'test',
        type: 'Object',
        name: 'test',
        payload: {
          id: 'test-model',
          name: 'test-model',
        },
        properties: [
          {
            destinationName: 'foo',
            name: 'foo',
            type: 'String',
            validation: {
              required: true,
              maxLength: 100,
              minLength: 10,
              format: 'password',
            },
          },
        ],
        validation: {
          required: true,
        },
      },
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayModel, {
      content_type: 'application/json',
      name: 'test-model',
      schema:
        '${jsonencode({"type" = "object", "required" = ["foo"], "properties" = {"foo" = {"type" = "string", "minLength" = 10, "maxLength" = 100, "format" = "password"}}})}',
    });
  });

  it('should return an existent model', () => {
    const { restApi } = setupTestingRestApi();

    const modelA = restApi.modelFactory.getModel({
      field: {
        destinationName: 'test',
        type: 'Object',
        name: 'test',
        payload: {
          id: 'test-model',
          name: 'test-model',
        },
        properties: [
          {
            destinationName: 'foo',
            name: 'foo',
            type: 'String',
            validation: {
              required: true,
              maxLength: 100,
              minLength: 10,
              format: 'password',
            },
          },
        ],
        validation: {
          required: true,
        },
      },
    });

    const modelB = restApi.modelFactory.getModel({
      field: {
        destinationName: 'test',
        type: 'Object',
        name: 'test',
        payload: {
          id: 'test-model',
          name: 'test-model',
        },
        properties: [
          {
            destinationName: 'foo',
            name: 'foo',
            type: 'String',
            validation: {
              required: true,
              maxLength: 100,
              minLength: 10,
              format: 'password',
            },
          },
        ],
        validation: {
          required: true,
        },
      },
    });

    expect(modelA).toBe(modelB);
  });

  it('should create a sub-models', () => {
    const { restApi, stack } = setupTestingRestApi();

    restApi.modelFactory.getModel({
      field: {
        destinationName: 'test',
        type: 'Object',
        name: 'test',
        payload: {
          id: 'test-model',
          name: 'test-model',
        },
        properties: [
          {
            destinationName: 'foo',
            name: 'foo',
            type: 'String',
            validation: {
              required: true,
              maxLength: 100,
              minLength: 10,
              format: 'password',
            },
          },
          {
            destinationName: 'bar',
            name: 'bar',
            type: 'Object',
            payload: {
              id: 'sub-model',
              name: 'sub-model',
            },
            validation: {
              required: true,
            },
            properties: [
              {
                destinationName: 'sub-bar',
                name: 'sub-bar',
                type: 'Number',
                validation: {
                  required: false,
                },
              },
            ],
          },
        ],
        validation: {
          required: true,
        },
      },
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayModel, {
      content_type: 'application/json',
      name: 'test-model',
      rest_api_id: '${aws_api_gateway_rest_api.testing-api-api.id}',
      schema:
        '${jsonencode({"type" = "object", "required" = ["foo", "bar"], "properties" = {"foo" = {"type" = "string", "minLength" = 10, "maxLength" = 100, "format" = "password"}, "bar" = {"$ref" = "https://apigateway.amazonaws.com/restapis/${aws_api_gateway_rest_api.testing-api-api.id}/models/${aws_api_gateway_model.testing-api-api_sub-model_D6402FA3.name}"}}})}',
    });

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayModel, {
      content_type: 'application/json',
      name: 'sub-model',
      rest_api_id: '${aws_api_gateway_rest_api.testing-api-api.id}',
      schema:
        '${jsonencode({"type" = "object", "required" = [], "properties" = {"sub-bar" = {"type" = "number"}}})}',
    });
  });
});
