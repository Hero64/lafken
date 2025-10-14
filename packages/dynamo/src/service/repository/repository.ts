import type { ClassResource } from '@alicanto/common';
import type { ModelPartition } from '../../main/model';
import { client, getClientWithXRay } from '../client/client';
import type { QueryBuilderProps } from '../query-builder/base/base.types';
import { BulkCreateBuilder } from '../query-builder/bulk-create/bulk-create';
import { BulkDeleteBuilder } from '../query-builder/bulk-delete/bulk-delete';
import { CreateBuilder } from '../query-builder/create/create';
import { DeleteBuilder } from '../query-builder/delete/delete';
import { FindAllBuilder } from '../query-builder/find-all/find-all';
import { FindOneBuilder } from '../query-builder/find-one/find-one';
import type {
  FindProps,
  Item,
  QueryOneProps,
  QueryProps,
  UpdateProps,
  UpsertProps,
} from '../query-builder/query-builder.types';
import { ScanBuilder } from '../query-builder/scan/scan';
import { UpdateBuilder } from '../query-builder/update/update';
import { UpsertBuilder } from '../query-builder/upsert/upsert';
import { getModelInformation } from './repository.utils';

export const createRepository = <E extends ClassResource>(model: E) => {
  const { modelProps, partitionKey, sortKey, fields } = getModelInformation(model);

  const queryBuilderProps: QueryBuilderProps<E> = {
    client: modelProps.tracing ? getClientWithXRay() : client,
    fields,
    modelProps,
    partitionKey,
    sortKey,
  };

  return {
    findOne(inputProps: QueryOneProps<E>) {
      return new FindOneBuilder({
        ...queryBuilderProps,
        inputProps: {
          ...inputProps,
          limit: 1,
        },
      });
    },
    findAll(inputProps: QueryProps<E>) {
      return new FindAllBuilder({
        ...queryBuilderProps,
        inputProps,
      });
    },
    scan(inputProps: FindProps<E> = {}) {
      return new ScanBuilder({
        ...queryBuilderProps,
        inputProps,
      });
    },
    upsert(item: Item<E>, inputProps: UpsertProps<E> = {}) {
      return new UpsertBuilder({
        ...queryBuilderProps,
        inputProps,
        item,
      });
    },
    create(item: Item<E>) {
      return new CreateBuilder({
        ...queryBuilderProps,
        item,
      });
    },
    update(inputProps: UpdateProps<E>) {
      return new UpdateBuilder({
        ...queryBuilderProps,
        inputProps,
      });
    },
    delete(key: ModelPartition<Item<E>>) {
      return new DeleteBuilder({
        ...queryBuilderProps,
        key,
      });
    },
    bulkCreate(items: Item<E>[]) {
      return new BulkCreateBuilder({
        ...queryBuilderProps,
        items,
      });
    },
    bulkDelete(keys: ModelPartition<Item<E>>[]) {
      return new BulkDeleteBuilder({
        ...queryBuilderProps,
        keys,
      });
    },
  };
};
