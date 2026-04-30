import type {
  ResponseArrayField,
  ResponseFieldMetadata,
  ResponseObjectMetadata,
} from '../../../../../../main';

export function buildResponseTemplate(response: ResponseObjectMetadata): string {
  return buildObjectValue(response.properties, '$');
}

function buildObjectValue(
  properties: ResponseFieldMetadata[],
  pathPrefix: string
): string {
  const entries = properties.map(
    (prop) => `"${prop.name}":${buildFieldValue(prop, `${pathPrefix}.${prop.name}`)}`
  );
  return `{${entries.join(',')}}`;
}

function buildFieldValue(field: ResponseFieldMetadata, path: string): string {
  if (field.template) return field.template;

  switch (field.type) {
    case 'String':
      return `"$input.path('${path}')"`;
    case 'Number':
    case 'Boolean':
    case 'Any':
      return `$input.path('${path}')`;
    case 'Object':
      return buildObjectValue(field.properties, path);
    case 'Array':
      return buildArrayValue(field, path);
  }
}

function buildArrayValue(field: ResponseArrayField, path: string): string {
  if (field.template) return field.template;
  if (field.items.type !== 'Object') return `$input.path('${path}')`;
  const itemTpl = buildItemObjectValue(field.items.properties);
  return `[#foreach($item in $input.path('${path}'))${itemTpl}#if($foreach.hasNext),#end#end]`;
}

function buildItemObjectValue(properties: ResponseFieldMetadata[]): string {
  const entries = properties.map(
    (prop) => `"${prop.name}":${buildItemFieldValue(prop, `$item.${prop.name}`)}`
  );
  return `{${entries.join(',')}}`;
}

function buildItemFieldValue(field: ResponseFieldMetadata, varPath: string): string {
  if (field.template) return field.template;

  switch (field.type) {
    case 'String':
      return `"${varPath}"`;
    case 'Number':
    case 'Boolean':
    case 'Any':
      return varPath;
    case 'Object':
      return buildItemObjectValue(field.properties);
    case 'Array':
      return varPath;
  }
}
