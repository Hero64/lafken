import type { DocModelSchemaProperties } from '../docs/docs.types';
import type { FullJsonSchema, JsonSchema } from './model.types';

const NON_DRAFT4_KEYS = new Set(['example', 'deprecated', 'nullable']);

export function stripNonDraft4Fields(schema: FullJsonSchema): JsonSchema {
  const clean: JsonSchema = {};

  for (const [key, value] of Object.entries(schema)) {
    if (NON_DRAFT4_KEYS.has(key)) {
      continue;
    }

    if (key === 'properties' && value) {
      clean.properties = {};
      for (const [propKey, propValue] of Object.entries(
        value as Record<string, FullJsonSchema>
      )) {
        clean.properties[propKey] = propValue.$ref
          ? propValue
          : stripNonDraft4Fields(propValue);
      }
      continue;
    }

    if (key === 'items' && value) {
      clean.items = Array.isArray(value)
        ? value.map(stripNonDraft4Fields)
        : stripNonDraft4Fields(value as FullJsonSchema);
      continue;
    }

    if (['allOf', 'oneOf', 'anyOf'].includes(key) && Array.isArray(value)) {
      (clean as Record<string, unknown>)[key] = (value as FullJsonSchema[]).map(
        stripNonDraft4Fields
      );
      continue;
    }

    if (key === 'not' && value) {
      clean.not = stripNonDraft4Fields(value as FullJsonSchema);
      continue;
    }

    (clean as Record<string, unknown>)[key] = value;
  }

  return clean;
}

export function buildDocProperties(
  schema: FullJsonSchema,
  modelName: string
): DocModelSchemaProperties | undefined {
  const doc: DocModelSchemaProperties = {};
  let hasContent = false;

  if (schema.description) {
    doc.description = schema.description;
  }

  if (schema.example !== undefined) {
    doc.example = schema.example;
    hasContent = true;
  }

  if (schema.deprecated !== undefined) {
    doc.deprecated = schema.deprecated;
    hasContent = true;
  }

  if (schema.nullable !== undefined) {
    doc.nullable = schema.nullable;
    hasContent = true;
  }

  if (schema.properties) {
    const propsDoc: Record<
      string,
      { example?: unknown; deprecated?: boolean; nullable?: boolean }
    > = {};
    for (const [propKey, propValue] of Object.entries(schema.properties)) {
      if (propValue.$ref) {
        continue;
      }

      const fieldDoc: { example?: unknown; deprecated?: boolean; nullable?: boolean } =
        {};
      let fieldHasContent = false;

      if (propValue.example !== undefined) {
        fieldDoc.example = propValue.example;
        fieldHasContent = true;
      }
      if (propValue.deprecated !== undefined) {
        fieldDoc.deprecated = propValue.deprecated;
        fieldHasContent = true;
      }
      if (propValue.nullable !== undefined) {
        fieldDoc.nullable = propValue.nullable;
        fieldHasContent = true;
      }

      if (fieldHasContent) {
        propsDoc[propKey] = fieldDoc;
        hasContent = true;
      }
    }

    if (Object.keys(propsDoc).length > 0) {
      doc.properties = propsDoc;
    }
  }

  if (!hasContent) {
    return undefined;
  }

  doc.title = modelName;

  return doc;
}
