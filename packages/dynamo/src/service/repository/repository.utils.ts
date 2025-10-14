import type { ClassResource } from '@alicanto/common';
import { type FieldsMetadata, ModelMetadataKeys } from '../../main/model';
import type { ModelMetadata } from '../query-builder/query-builder.types';

export const getModelInformation = <E extends ClassResource>(model: E) => {
  const modelProps: ModelMetadata<E> = Reflect.getMetadata(
    ModelMetadataKeys.MODEL,
    model
  );
  const partitionKey: string = Reflect.getMetadata(
    ModelMetadataKeys.PARTITION_KEY,
    model.prototype
  );

  const sortKey: string | undefined = Reflect.getMetadata(
    ModelMetadataKeys.SORT_KEY,
    model.prototype
  );

  const fields: FieldsMetadata = Reflect.getMetadata(
    ModelMetadataKeys.FIELDS,
    model.prototype
  );

  return {
    modelProps,
    partitionKey,
    sortKey,
    fields,
  };
};
