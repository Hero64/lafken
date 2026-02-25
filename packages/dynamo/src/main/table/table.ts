import { getPrimitiveType } from '@lafken/common';
import {
  type DynamoTableProps,
  type FieldProps,
  type FieldsMetadata,
  TableMetadataKeys,
} from './table.types';

export const Table =
  <T extends Function>(props: DynamoTableProps<T> = {}) =>
  (constructor: T) => {
    const { name = constructor.name, indexes = [], ...dynamoProps } = props;

    Reflect.defineMetadata(
      TableMetadataKeys.table,
      {
        ...dynamoProps,
        name,
        indexes,
      },
      constructor
    );
  };

export const Field =
  (props: FieldProps = {}) =>
  (constructor: any, name: string) => {
    const { type: fieldType } = props;

    const fields: FieldsMetadata[] =
      Reflect.getMetadata(TableMetadataKeys.fields, constructor) || {};
    const type = fieldType
      ? getPrimitiveType(fieldType) || 'Object'
      : Reflect.getMetadata('design:type', constructor, name).name;

    Reflect.defineMetadata(
      TableMetadataKeys.fields,
      {
        ...fields,
        [name]: {
          name,
          type,
        },
      },
      constructor
    );
  };

export const PartitionKey =
  (type: StringConstructor | NumberConstructor) => (constructor: any, name: string) => {
    Field({ type })(constructor, name);
    Reflect.defineMetadata(TableMetadataKeys.partition_key, name, constructor);
  };

export const SortKey =
  (type: StringConstructor | NumberConstructor) => (constructor: any, name: string) => {
    Field({ type })(constructor, name);
    Reflect.defineMetadata(TableMetadataKeys.sort_key, name, constructor);
  };
