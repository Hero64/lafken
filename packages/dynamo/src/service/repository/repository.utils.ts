import type { ClassResource } from '@lafken/common';
import { type FieldsMetadata, TableMetadataKeys } from '../../main/table';
import type { ModelMetadata } from '../query-builder/query-builder.types';

export const getModelInformation = <E extends ClassResource>(table: E) => {
  const modelProps: ModelMetadata<E> = Reflect.getMetadata(
    TableMetadataKeys.table,
    table
  );
  const partitionKey: string = Reflect.getMetadata(
    TableMetadataKeys.partition_key,
    table.prototype
  );

  const sortKey: string | undefined = Reflect.getMetadata(
    TableMetadataKeys.sort_key,
    table.prototype
  );

  const fields: FieldsMetadata = Reflect.getMetadata(
    TableMetadataKeys.fields,
    table.prototype
  );

  return {
    modelProps,
    partitionKey,
    sortKey,
    fields,
  };
};
