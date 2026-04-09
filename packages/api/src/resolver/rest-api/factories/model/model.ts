import { ApiGatewayModel } from '@cdktn/provider-aws/lib/api-gateway-model';
import { cleanAndCapitalize } from '@lafken/common';
import { uuid } from '@lafken/resolver';
import { Annotations, Fn, Token } from 'cdktn';
import type { ResponseFieldMetadata } from '../../../../main';
import type { RestApi } from '../../../resolver.types';
import type { CreateModelResponse, GetModelProps, JsonSchema } from './model.types';

export const schemaTypeMap: Record<string, string> = {
  String: 'string',
  Number: 'number',
  Boolean: 'boolean',
  Array: 'array',
  Object: 'object',
};

export class ModelFactory {
  private models: Record<string, ApiGatewayModel> = {};

  constructor(private scope: RestApi) {}

  get resources() {
    return Object.values(this.models);
  }

  public getModel({ field, defaultModelName, dependsOn }: GetModelProps) {
    const { schema, model } = this.createModel(field);
    if (model) {
      return model;
    }

    const modelName = defaultModelName || uuid();

    const newModel = new ApiGatewayModel(this.scope, defaultModelName || uuid(), {
      description:
        field.type === 'Object' ? field.payload?.description : field.description,
      name: cleanAndCapitalize(modelName),
      restApiId: this.scope.id,
      contentType: 'application/json',
      schema: JSON.stringify(schema),
      dependsOn,
    });

    this.models[modelName] = newModel;

    return newModel;
  }

  private validateMinMax(
    minKey: string,
    maxKey: string,
    name: string,
    min?: number,
    max?: number
  ) {
    if (min !== undefined && max !== undefined && min > max) {
      Annotations.of(this.scope).addWarning(
        `${minKey} (${min}) in "${name}" field should be less than ${maxKey} (${max})`
      );
    }
  }

  private createModel = (field: ResponseFieldMetadata): CreateModelResponse => {
    if (field.type === 'String') {
      this.validateMinMax(
        'minLength',
        'maxLength',
        field.name,
        field.minLength,
        field.maxLength
      );

      return {
        schema: {
          type: 'string',
          deprecated: field.deprecated,
          description: field.description,
          nullable: field.nullable,
          example: field.example,
          enum: field.enum,
          minLength: field.minLength,
          maxLength: field.maxLength,
          format: field.format,
          pattern: field.pattern,
        },
      };
    }

    if (field.type === 'Number') {
      this.validateMinMax('min', 'max', field.name, field.min, field.max);

      return {
        schema: {
          type: 'number',
          deprecated: field.deprecated,
          description: field.description,
          example: field.example,
          nullable: field.nullable,
          minimum: field.min,
          maximum: field.max,
          exclusiveMinimum: field.exclusiveMin,
          exclusiveMaximum: field.exclusiveMax,
          multipleOf: field.multipleOf,
        },
      };
    }

    if (field.type === 'Boolean') {
      return {
        schema: {
          deprecated: field.deprecated,
          description: field.description,
          example: field.example,
          nullable: field.nullable,
          type: 'boolean',
        },
      };
    }

    if (field.type === 'Object') {
      const model = this.models[field.payload.id];
      if (model) {
        return {
          model,
          schema: {
            $ref: `https://apigateway.amazonaws.com/restapis/${this.scope.id}/models/${model.name}`,
          },
        };
      }

      const properties: Record<string, JsonSchema> = {};
      const requiredField: string[] = [];

      for (const property of field.properties) {
        const { schema, model } = this.createModel(property);
        if (model) {
          properties[property.name] = {
            $ref: `https://apigateway.amazonaws.com/restapis/${this.scope.id}/models/${model.name}`,
          };
        } else {
          properties[property.name] = schema;
        }

        if (property.required) {
          requiredField.push(property.name);
        }
      }

      const schema: JsonSchema = {
        type: 'object',
        required: requiredField.length > 0 ? requiredField : undefined,
        properties,
        deprecated: field.deprecated,
        description: field.payload?.description || field.description,
        example: field.example,
        additionalProperties: field.payload.additionalProperties,
        nullable: field.nullable,
        allOf: field.payload.allOf as JsonSchema[],
        oneOf: field.payload.oneOf as JsonSchema[],
        anyOf: field.payload.anyOf as JsonSchema[],
        not: field.payload.not as JsonSchema,
      };

      const newModel = new ApiGatewayModel(this.scope, field.payload.id, {
        contentType: 'application/json',
        name: cleanAndCapitalize(field.payload.id),
        restApiId: this.scope.id,
        schema: Token.asString(Fn.jsonencode(schema)),
      });

      this.models[field.payload.id] = newModel;

      return {
        model: newModel,
        schema,
      };
    }

    return {
      schema: {
        type: 'array',
        items: this.createModel(field.items).schema,
        deprecated: field.deprecated,
        description: field.description,
        example: field.example,
        nullable: field.nullable,
      },
    };
  };
}
