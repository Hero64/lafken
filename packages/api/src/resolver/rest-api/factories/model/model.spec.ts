import { ApiGatewayDocumentationPart } from '@cdktn/provider-aws/lib/api-gateway-documentation-part';
import { ApiGatewayModel } from '@cdktn/provider-aws/lib/api-gateway-model';
import { enableBuildEnvVariable } from '@lafken/common';
import { Testing } from 'cdktn';
import { describe, expect, it } from 'vitest';
import { setupInternalTestingRestApi } from '../../../utils/testing.utils';
import { buildDocProperties, stripNonDraft4Fields } from './model.utils';

describe('Model factory', () => {
  enableBuildEnvVariable();
  it('should create a new model', () => {
    const { restApi, stack } = setupInternalTestingRestApi();

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
            required: true,
            maxLength: 100,
            minLength: 10,
            format: 'password',
          },
        ],
        required: true,
      },
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayModel, {
      content_type: 'application/json',
      name: 'TestModel',
      schema:
        '${jsonencode({"type" = "object", "required" = ["foo"], "properties" = {"foo" = {"type" = "string", "minLength" = 10, "maxLength" = 100, "format" = "password"}}})}',
    });
  });

  it('should return an existent model', () => {
    const { restApi } = setupInternalTestingRestApi();

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
            required: true,
            maxLength: 100,
            minLength: 10,
            format: 'password',
          },
        ],

        required: true,
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
            required: true,
            maxLength: 100,
            minLength: 10,
            format: 'password',
          },
        ],
        required: true,
      },
    });

    expect(modelA).toBe(modelB);
  });

  it('should create a sub-models', () => {
    const { restApi, stack } = setupInternalTestingRestApi();

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
            required: true,
            maxLength: 100,
            minLength: 10,
            format: 'password',
          },
          {
            destinationName: 'bar',
            name: 'bar',
            type: 'Object',
            payload: {
              id: 'sub-model',
              name: 'sub-model',
            },
            required: true,
            properties: [
              {
                destinationName: 'sub-bar',
                name: 'sub-bar',
                type: 'Number',
                required: false,
              },
            ],
          },
        ],
        required: true,
      },
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayModel, {
      content_type: 'application/json',
      name: 'TestModel',
      rest_api_id: '${aws_api_gateway_rest_api.testing-api-api.id}',
      schema:
        '${jsonencode({"type" = "object", "required" = ["foo", "bar"], "properties" = {"foo" = {"type" = "string", "minLength" = 10, "maxLength" = 100, "format" = "password"}, "bar" = {"$ref" = "https://apigateway.amazonaws.com/restapis/${aws_api_gateway_rest_api.testing-api-api.id}/models/${aws_api_gateway_model.testing-api-api_sub-model_D6402FA3.name}"}}})}',
    });

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayModel, {
      content_type: 'application/json',
      name: 'SubModel',
      rest_api_id: '${aws_api_gateway_rest_api.testing-api-api.id}',
      schema:
        '${jsonencode({"type" = "object", "properties" = {"sub-bar" = {"type" = "number"}}})}',
    });
  });

  it('should strip non-Draft-4 fields from model schema', () => {
    const { restApi, stack } = setupInternalTestingRestApi();

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
            required: true,
            example: 'example-value',
            deprecated: true,
            nullable: true,
            maxLength: 50,
          },
          {
            destinationName: 'bar',
            name: 'bar',
            type: 'Number',
            example: 42,
            nullable: true,
          },
        ],
        required: true,
      },
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayModel, {
      content_type: 'application/json',
      name: 'TestModel',
      schema:
        '${jsonencode({"type" = "object", "required" = ["foo"], "properties" = {"foo" = {"type" = "string", "maxLength" = 50}, "bar" = {"type" = "number"}}})}',
    });
  });

  it('should create MODEL documentation part with non-Draft-4 fields', () => {
    const { restApi, stack } = setupInternalTestingRestApi();

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
            required: true,
            example: 'example-value',
            deprecated: true,
            nullable: true,
          },
        ],
        required: true,
      },
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayDocumentationPart, {
      location: {
        type: 'MODEL',
        name: 'TestModel',
      },
      properties: JSON.stringify({
        properties: {
          foo: {
            example: 'example-value',
            deprecated: true,
            nullable: true,
          },
        },
        title: 'TestModel',
      }),
    });
  });

  it('should not create MODEL documentation part when no non-Draft-4 fields exist', () => {
    const { restApi, stack } = setupInternalTestingRestApi();

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
            required: true,
            maxLength: 100,
            minLength: 10,
            format: 'password',
          },
        ],
        required: true,
      },
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).not.toHaveResourceWithProperties(ApiGatewayDocumentationPart, {
      location: {
        type: 'MODEL',
      },
    });
  });
});

describe('stripNonDraft4Fields', () => {
  it('should remove example, deprecated, and nullable from schema', () => {
    const result = stripNonDraft4Fields({
      type: 'string',
      description: 'A name',
      example: 'John',
      deprecated: true,
      nullable: true,
      minLength: 1,
    });

    expect(result).toEqual({
      type: 'string',
      description: 'A name',
      minLength: 1,
    });
  });

  it('should recursively strip from nested properties', () => {
    const result = stripNonDraft4Fields({
      type: 'object',
      properties: {
        name: {
          type: 'string',
          example: 'John',
          nullable: true,
        },
        age: {
          type: 'number',
          deprecated: true,
        },
      },
    });

    expect(result).toEqual({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
    });
  });

  it('should recursively strip from array items', () => {
    const result = stripNonDraft4Fields({
      type: 'array',
      items: {
        type: 'string',
        example: 'item',
        nullable: true,
      },
    });

    expect(result).toEqual({
      type: 'array',
      items: { type: 'string' },
    });
  });

  it('should preserve $ref properties without modification', () => {
    const result = stripNonDraft4Fields({
      type: 'object',
      properties: {
        sub: {
          $ref: 'https://example.com/models/Sub',
        },
      },
    });

    expect(result).toEqual({
      type: 'object',
      properties: {
        sub: { $ref: 'https://example.com/models/Sub' },
      },
    });
  });
});

describe('buildDocProperties', () => {
  it('should return undefined when no non-Draft-4 fields exist', () => {
    const result = buildDocProperties(
      { type: 'object', description: 'test' },
      'TestModel'
    );

    expect(result).toBeUndefined();
  });

  it('should extract non-Draft-4 fields from schema', () => {
    const result = buildDocProperties(
      {
        type: 'object',
        description: 'A user',
        example: { name: 'John' },
        deprecated: true,
        nullable: true,
        properties: {
          name: {
            type: 'string',
            example: 'John',
            deprecated: true,
            nullable: true,
          },
        },
      },
      'UserModel'
    );

    expect(result).toEqual({
      description: 'A user',
      example: { name: 'John' },
      deprecated: true,
      nullable: true,
      properties: {
        name: {
          example: 'John',
          deprecated: true,
          nullable: true,
        },
      },
      title: 'UserModel',
    });
  });

  it('should skip $ref properties', () => {
    const result = buildDocProperties(
      {
        type: 'object',
        example: { id: 1 },
        properties: {
          sub: { $ref: 'https://example.com/models/Sub' },
          name: { type: 'string', example: 'test' },
        },
      },
      'TestModel'
    );

    expect(result).toEqual({
      example: { id: 1 },
      properties: {
        name: { example: 'test' },
      },
      title: 'TestModel',
    });
  });
});
