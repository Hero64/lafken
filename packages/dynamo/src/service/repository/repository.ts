import type { ClassResource } from '@lafken/common';
import type { DynamoIndex, TablePartition } from '../../main/table';
import { InMemoryCache } from '../cache/in-memory-cache';
import { client, getClientWithXRay } from '../client/client';
import type { QueryBuilderProps } from '../query-builder/base/base.types';
import { BatchGetBuilder } from '../query-builder/batch-get/batch-get';
import type { BatchGetOptions } from '../query-builder/batch-get/batch-get.types';
import { BulkCreateBuilder } from '../query-builder/bulk-create/bulk-create';
import { BulkDeleteBuilder } from '../query-builder/bulk-delete/bulk-delete';
import { CreateBuilder } from '../query-builder/create/create';
import { DeleteBuilder } from '../query-builder/delete/delete';
import { DynamoIndexes } from '../query-builder/dynamo-index/dynamo-index';
import { FindAllBuilder } from '../query-builder/find-all/find-all';
import { FindOneBuilder } from '../query-builder/find-one/find-one';
import { GetItemBuilder } from '../query-builder/get-item/get-item';
import type { GetItemOptions } from '../query-builder/get-item/get-item.types';
import type {
  FindProps,
  Item,
  QueryOneProps,
  QueryProps,
  ReturnValueOption,
  UpdateProps,
  UpsertProps,
} from '../query-builder/query-builder.types';
import { ScanBuilder } from '../query-builder/scan/scan';
import { UpdateBuilder } from '../query-builder/update/update';
import { UpsertBuilder } from '../query-builder/upsert/upsert';
import type { RepositoryReturn } from './repository.types';
import { getModelInformation } from './repository.utils';

export const createRepository = <E extends ClassResource>(
  model: E
): RepositoryReturn<E> => {
  const { modelProps, partitionKey, sortKey, fields } = getModelInformation(model);

  const queryBuilderProps: QueryBuilderProps<E> = {
    client: modelProps.tracing ? getClientWithXRay() : client,
    fields,
    modelProps,
    partitionKey,
    sortKey,
  };

  const indexes = new DynamoIndexes(
    modelProps.indexes as DynamoIndex<any>[],
    partitionKey,
    sortKey
  );

  const cache = new InMemoryCache();

  return {
    findOne(inputProps: QueryOneProps<E>, cacheTtl?: number) {
      return new FindOneBuilder({
        ...queryBuilderProps,
        indexes,
        cache,
        cacheTtl,
        inputProps: {
          ...inputProps,
          limit: 1,
        },
      });
    },
    findAll(inputProps: QueryProps<E>, cacheTtl?: number) {
      return new FindAllBuilder({
        ...queryBuilderProps,
        indexes,
        cache,
        cacheTtl,
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
    update<R extends ReturnValueOption | undefined = undefined>(
      inputProps: Omit<UpdateProps<E>, 'returnValue'> & { returnValue?: R }
    ) {
      return new UpdateBuilder<E, R>({
        ...queryBuilderProps,
        inputProps: inputProps as UpdateProps<E>,
      });
    },
    getItem(key: TablePartition<Item<E>>, options?: GetItemOptions<E>) {
      return new GetItemBuilder({
        ...queryBuilderProps,
        key,
        cache,
        options,
      });
    },
    delete(key: TablePartition<Item<E>>) {
      return new DeleteBuilder({
        ...queryBuilderProps,
        key,
      });
    },
    batchGet(keys: TablePartition<Item<E>>[], options?: BatchGetOptions<E>) {
      return new BatchGetBuilder({
        ...queryBuilderProps,
        keys,
        options,
      });
    },
    bulkCreate(items: Item<E>[]) {
      return new BulkCreateBuilder({
        ...queryBuilderProps,
        items,
      });
    },
    bulkDelete(keys: TablePartition<Item<E>>[]) {
      return new BulkDeleteBuilder({
        ...queryBuilderProps,
        keys,
      });
    },
    sendRawCommand<T = unknown>(
      command: Parameters<typeof queryBuilderProps.client.send>[0]
    ) {
      return queryBuilderProps.client.send(command) as Promise<T>;
    },
  };
};
