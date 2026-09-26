import type { FieldTypes } from '@lafken/common';

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
    throw new Error(
      `Unsupported value "${String(value)}" (${valueType}). Use a string, number, boolean, object or array.`
    );
  }

  return fieldType;
};
