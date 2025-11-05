import { uuid } from '@alicanto/resolver';
import { ApiGatewayModel } from '@cdktf/provider-aws/lib/api-gateway-model';
import { Fn, Token } from 'cdktf';
import type { ApiFieldMetadata } from '../../../../main';
import type { RestApi } from '../../rest-api';
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
      name: modelName,
      restApiId: this.scope.id,
      contentType: 'application/json',
      schema: JSON.stringify(schema),
      dependsOn,
    });

    this.models[modelName] = newModel;

    return newModel;
  }

  private createModel = (field: ApiFieldMetadata): CreateModelResponse => {
    if (field.type === 'String') {
      return {
        schema: {
          type: 'string',
          enum: field.validation?.enum,
          minLength: field.validation?.minLength,
          maxLength: field.validation?.maxLength,
          format: field.validation?.format,
          pattern: field.validation?.pattern,
        },
      };
    }

    if (field.type === 'Number') {
      return {
        schema: {
          type: 'number',
          minimum: field.validation?.minimum,
          maximum: field.validation?.maximum,
          exclusiveMinimum: field.validation?.exclusiveMinimum,
          multipleOf: field.validation?.multipleOf,
        },
      };
    }

    if (field.type === 'Boolean') {
      return {
        schema: {
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

        if (property.validation.required) {
          requiredField.push(property.name);
        }
      }

      const schema: JsonSchema = {
        type: 'object',
        required: requiredField,
        properties,
      };

      const newModel = new ApiGatewayModel(this.scope, field.payload.id, {
        contentType: 'application/json',
        name: field.payload.id,
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
      },
    };
  };
}
