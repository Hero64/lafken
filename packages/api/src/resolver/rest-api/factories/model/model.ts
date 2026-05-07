import { ApiGatewayModel } from '@cdktn/provider-aws/lib/api-gateway-model';
import { cleanAndCapitalize } from '@lafken/common';
import { uuid } from '@lafken/resolver';
import { Annotations, Fn, Token } from 'cdktn';
import type { ResponseFieldMetadata } from '../../../../main';
import type { RestApi } from '../../../resolver.types';
import type {
  CreateModelResponse,
  FullJsonSchema,
  GetModelProps,
  JsonSchema,
} from './model.types';
import { buildDocProperties, stripNonDraft4Fields } from './model.utils';

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
    const { schema, fullSchema, model } = this.createModel(field);
    if (model) {
      return model;
    }

    const modelName = defaultModelName || uuid();
    const capitalizedName = cleanAndCapitalize(modelName);

    const newModel = new ApiGatewayModel(this.scope, defaultModelName || uuid(), {
      description:
        field.type === 'Object' ? field.payload?.description : field.description,
      name: capitalizedName,
      restApiId: this.scope.id,
      contentType: 'application/json',
      schema: JSON.stringify(schema),
      dependsOn,
    });

    this.createModelDoc(fullSchema, capitalizedName);

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

      const fullSchema: FullJsonSchema = {
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
      };

      return {
        fullSchema,
        schema: stripNonDraft4Fields(fullSchema),
      };
    }

    if (field.type === 'Number') {
      this.validateMinMax('min', 'max', field.name, field.min, field.max);

      const fullSchema: FullJsonSchema = {
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
      };

      return {
        fullSchema,
        schema: stripNonDraft4Fields(fullSchema),
      };
    }

    if (field.type === 'Boolean') {
      const fullSchema: FullJsonSchema = {
        deprecated: field.deprecated,
        description: field.description,
        example: field.example,
        nullable: field.nullable,
        type: 'boolean',
      };

      return {
        fullSchema,
        schema: stripNonDraft4Fields(fullSchema),
      };
    }

    if (field.type === 'Object') {
      const model = this.models[field.payload.id];
      if (model) {
        const refSchema = {
          $ref: `https://apigateway.amazonaws.com/restapis/${this.scope.id}/models/${model.name}`,
        };
        return {
          model,
          schema: refSchema,
          fullSchema: refSchema,
        };
      }

      const properties: Record<string, JsonSchema> = {};
      const fullProperties: Record<string, FullJsonSchema> = {};
      const requiredField: string[] = [];

      for (const property of field.properties) {
        const { schema, fullSchema, model } = this.createModel(property);
        if (model) {
          const refSchema = {
            $ref: `https://apigateway.amazonaws.com/restapis/${this.scope.id}/models/${model.name}`,
          };
          properties[property.name] = refSchema;
          fullProperties[property.name] = refSchema;
        } else {
          properties[property.name] = schema;
          fullProperties[property.name] = fullSchema;
        }

        if (property.required) {
          requiredField.push(property.name);
        }
      }

      const fullSchema: FullJsonSchema = {
        type: 'object',
        required: requiredField.length > 0 ? requiredField : undefined,
        properties: fullProperties,
        deprecated: field.deprecated,
        description: field.payload?.description || field.description,
        example: field.example,
        additionalProperties: field.payload.additionalProperties,
        nullable: field.nullable,
        allOf: field.payload.allOf as FullJsonSchema[],
        oneOf: field.payload.oneOf as FullJsonSchema[],
        anyOf: field.payload.anyOf as FullJsonSchema[],
        not: field.payload.not as FullJsonSchema,
      };

      const schema = stripNonDraft4Fields(fullSchema);
      const modelName = cleanAndCapitalize(field.payload.id);

      const newModel = new ApiGatewayModel(this.scope, field.payload.id, {
        contentType: 'application/json',
        name: modelName,
        restApiId: this.scope.id,
        schema: Token.asString(Fn.jsonencode(schema)),
      });

      this.createModelDoc(fullSchema, modelName);

      this.models[field.payload.id] = newModel;

      return {
        model: newModel,
        schema,
        fullSchema,
      };
    }

    if (field.type === 'Any') {
      const fullSchema: FullJsonSchema = {
        deprecated: field.deprecated,
        description: field.description,
        example: field.example,
        nullable: field.nullable,
        type: 'object',
      };

      return {
        fullSchema,
        schema: stripNonDraft4Fields(fullSchema),
      };
    }

    const itemResult = this.createModel(field.items);

    const fullSchema: FullJsonSchema = {
      type: 'array',
      items: itemResult.fullSchema,
      deprecated: field.deprecated,
      description: field.description,
      example: field.example,
      nullable: field.nullable,
      maxItems: field.maxItems,
      minItems: field.minItems,
      uniqueItems: field.uniqueItems,
    };

    return {
      fullSchema,
      schema: stripNonDraft4Fields(fullSchema),
    };
  };

  private createModelDoc(fullSchema: FullJsonSchema, modelName: string) {
    const docProperties = buildDocProperties(fullSchema, modelName);
    if (!docProperties) {
      return;
    }

    this.scope.docsFactory.createDoc({
      id: `${modelName}-model`,
      location: {
        type: 'MODEL',
        name: modelName,
      },
      properties: docProperties,
    });
  }
}
