import type { ClassResource } from '@lafken/common';
import type { DynamoIndex, TablePartition } from '../../main/table';
import { client, getClientWithXRay } from '../client/client';
import type { QueryBuilderProps } from '../query-builder/base/base.types';
import { BulkCreateBuilder } from '../query-builder/bulk-create/bulk-create';
import { BulkDeleteBuilder } from '../query-builder/bulk-delete/bulk-delete';
import { CreateBuilder } from '../query-builder/create/create';
import { DeleteBuilder } from '../query-builder/delete/delete';
import { DynamoIndexes } from '../query-builder/dynamo-index/dynamo-index';
import { FindAllBuilder } from '../query-builder/find-all/find-all';
import { FindOneBuilder } from '../query-builder/find-one/find-one';
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

  return {
    findOne(inputProps: QueryOneProps<E>) {
      return new FindOneBuilder({
        ...queryBuilderProps,
        indexes,
        inputProps: {
          ...inputProps,
          limit: 1,
        },
      });
    },
    findAll(inputProps: QueryProps<E>) {
      return new FindAllBuilder({
        ...queryBuilderProps,
        indexes,
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
    delete(key: TablePartition<Item<E>>) {
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
