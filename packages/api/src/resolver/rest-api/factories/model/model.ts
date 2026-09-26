import { ApiGatewayModel } from '@cdktn/provider-aws/lib/api-gateway-model';
import { cleanAndCapitalize } from '@lafken/common';
import { uuid } from '@lafken/resolver';
import { Annotations, Fn, Token } from 'cdktn';
import type { ResponseFieldMetadata } from '../../../../main';
import type { RestApi } from '../../../resolver.types';
import type { DocLocation } from '../docs/docs.types';
import type {
  CreateModelResponse,
  FullJsonSchema,
  GetModelProps,
  JsonSchema,
  ModelRef,
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
  private componentRefs: Record<string, ModelRef> = {};
  private documentedModels = new Set<string>();

  constructor(private scope: RestApi) {}

  get resources() {
    return Object.values(this.models);
  }

  private get isOpenApi() {
    return this.scope.openapiFactory.isEnabled;
  }

  private objectRef(name: string) {
    return this.isOpenApi
      ? this.scope.openapiFactory.getSchemaRef(name)
      : `https://apigateway.amazonaws.com/restapis/${this.scope.id}/models/${name}`;
  }

  private registeredObject(id: string): ModelRef | undefined {
    if (this.isOpenApi) {
      return this.componentRefs[id];
    }

    const model = this.models[id];
    return model ? { name: model.name, ref: this.objectRef(model.name) } : undefined;
  }

  public getModel({ field, defaultModelName, dependsOn }: GetModelProps): ModelRef {
    const { schema, fullSchema, model, ref, name } = this.createModel(field);
    if (model) {
      return { name: model.name, ref: this.objectRef(model.name) };
    }
    if (ref && name) {
      return { name, ref };
    }

    const modelName = defaultModelName || uuid();
    const capitalizedName = cleanAndCapitalize(modelName);

    if (this.isOpenApi) {
      const componentRef = this.scope.openapiFactory.addSchema(capitalizedName, schema);
      this.createModelDoc(fullSchema, capitalizedName);
      return { name: capitalizedName, ref: componentRef };
    }

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

    return { name: newModel.name, ref: this.objectRef(newModel.name) };
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
        `Field "${name}": ${minKey} (${min}) must be less than ${maxKey} (${max}).`
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
      const existing = this.registeredObject(field.payload.id);
      if (existing) {
        const refSchema = { $ref: existing.ref };
        return {
          model: this.models[field.payload.id],
          ref: existing.ref,
          name: existing.name,
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
          const refSchema = { $ref: this.objectRef(model.name) };
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

      if (this.isOpenApi) {
        const ref = this.scope.openapiFactory.addSchema(modelName, schema);
        this.componentRefs[field.payload.id] = { name: modelName, ref };
        this.createModelDoc(fullSchema, modelName);
        const refSchema = { $ref: ref };
        return { ref, name: modelName, schema: refSchema, fullSchema: refSchema };
      }

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

    // A created model must be referenced, never inlined, otherwise the item
    // schema is duplicated in every array that uses it.
    const items = itemResult.model
      ? { $ref: this.objectRef(itemResult.model.name) }
      : itemResult.fullSchema;

    const fullSchema: FullJsonSchema = {
      type: 'array',
      items,
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

  /**
   * `example`, `nullable` and `deprecated` are stripped from the model schema
   * because API Gateway models only accept JSON Schema draft 4, so they are
   * published as documentation parts instead: real resources in "resource"
   * mode, `x-amazon-apigateway-documentation` entries in openapi mode.
   */
  private createModelDoc(fullSchema: FullJsonSchema, modelName: string) {
    const docProperties = buildDocProperties(fullSchema, modelName);
    if (!docProperties) {
      return;
    }

    const location: DocLocation = {
      type: 'MODEL',
      name: modelName,
    };

    if (this.isOpenApi) {
      // Unlike the "resource" mode, where a repeated doc part would collide on
      // the construct id, duplicated parts inside the body are rejected by the
      // API Gateway import, so a schema is documented only once.
      if (this.documentedModels.has(modelName)) {
        return;
      }

      this.documentedModels.add(modelName);
      this.scope.openapiFactory.addDocumentationPart(location, docProperties);
      return;
    }

    this.scope.docsFactory.createDoc({
      id: `${modelName}-model`,
      location,
      properties: docProperties,
    });
  }
}
