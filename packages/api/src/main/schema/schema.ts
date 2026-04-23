import type {
  ApiObjectMetadata,
  ApiParamMetadata,
  PartialSchema,
  PropertySchema,
} from '..';
import type { SchemaDefinition } from '../validator/validators';

const propertySchemaToDefinition = (prop: PropertySchema): SchemaDefinition => ({
  type: prop.type,
  enum: prop.enum,
  const: prop.const,
  minimum: prop.minimum,
  maximum: prop.maximum,
  minLength: prop.minLength,
  maxLength: prop.maxLength,
  pattern: prop.pattern,
  format: prop.format,
  nullable: prop.nullable,
});

const partialSchemaToDefinition = (partial: PartialSchema<any>): SchemaDefinition => {
  const schema: SchemaDefinition = {};

  if (partial.properties) {
    schema.properties = {};
    for (const [key, propSchema] of Object.entries(partial.properties)) {
      if (propSchema) {
        schema.properties[key] = propertySchemaToDefinition(propSchema);
      }
    }
  }

  if (partial.required) {
    schema.required = partial.required as string[];
  }

  return schema;
};

export const paramToSchema = (param: ApiParamMetadata): SchemaDefinition => {
  if (param.type === 'String') {
    return {
      type: 'string',
      nullable: param.nullable,
      enum: param.enum,
      minLength: param.minLength,
      maxLength: param.maxLength,
      pattern: param.pattern,
      format: param.format,
    };
  }

  if (param.type === 'Number') {
    return {
      type: 'number',
      nullable: param.nullable,
      minimum: param.min,
      maximum: param.max,
      exclusiveMinimum: param.exclusiveMin,
      exclusiveMaximum: param.exclusiveMax,
      multipleOf: param.multipleOf,
    };
  }

  if (param.type === 'Boolean') {
    return {
      type: 'boolean',
      nullable: param.nullable,
    };
  }

  if (param.type === 'Array') {
    return {
      type: 'array',
      items: paramToSchema(param.items),
      nullable: param.nullable,
      minItems: param.minItems,
      maxItems: param.maxItems,
      uniqueItems: param.uniqueItems,
    };
  }

  if (param.type === 'Any') {
    return {
      type: 'object',
      nullable: param.nullable,
    };
  }

  return objectToSchema(param);
};

export const objectToSchema = (data: ApiObjectMetadata): SchemaDefinition => {
  const properties: Record<string, SchemaDefinition> = {};
  const required: string[] = [];

  for (const property of data.properties) {
    properties[property.name] = paramToSchema(property);

    if (property.required) {
      required.push(property.name);
    }
  }

  const schema: SchemaDefinition = {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
    nullable: data.nullable,
    additionalProperties: data.payload.additionalProperties,
  };

  if (data.payload.allOf) {
    schema.allOf = data.payload.allOf.map(partialSchemaToDefinition);
  }
  if (data.payload.anyOf) {
    schema.anyOf = data.payload.anyOf.map(partialSchemaToDefinition);
  }
  if (data.payload.oneOf) {
    schema.oneOf = data.payload.oneOf.map(partialSchemaToDefinition);
  }
  if (data.payload.not) {
    schema.not = partialSchemaToDefinition(data.payload.not);
  }

  return schema;
};
