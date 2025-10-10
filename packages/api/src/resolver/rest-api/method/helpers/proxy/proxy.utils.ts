import type { FieldTypes } from '@alicanto/common';

const mapValueTypeField: Record<string, FieldTypes> = {
  string: 'String',
  number: 'Number',
  boolean: 'Boolean',
  object: 'Object',
};

export const getVariableFieldType = (value: any): FieldTypes => {
  const valueType = typeof value;

  if (valueType === 'object' && Array.isArray(value)) {
    return 'Array';
  }

  const fieldType = mapValueTypeField[valueType];

  if (fieldType === undefined) {
    throw new Error(`Value ${value} is not supported`);
  }

  return fieldType;
};
