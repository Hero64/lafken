import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { ClassResource } from '@lafken/common';
import type { TablePartition } from '../../main';
import type {
  FindProps,
  Item,
  QueryOneProps,
  QueryProps,
  ReturnValueOption,
  UpdateProps,
  UpsertProps,
} from '../query-builder';
import type { BatchGetBuilder } from '../query-builder/batch-get/batch-get';
import type { BatchGetOptions } from '../query-builder/batch-get/batch-get.types';
import type { BulkCreateBuilder } from '../query-builder/bulk-create/bulk-create';
import type { BulkDeleteBuilder } from '../query-builder/bulk-delete/bulk-delete';
import type { CreateBuilder } from '../query-builder/create/create';
import type { DeleteBuilder } from '../query-builder/delete/delete';
import type { FindAllBuilder } from '../query-builder/find-all/find-all';
import type { FindOneBuilder } from '../query-builder/find-one/find-one';
import type { GetItemBuilder } from '../query-builder/get-item/get-item';
import type { GetItemOptions } from '../query-builder/get-item/get-item.types';
import type { ScanBuilder } from '../query-builder/scan/scan';
import type { UpdateBuilder } from '../query-builder/update/update';
import type { UpsertBuilder } from '../query-builder/upsert/upsert';

export type RepositoryReturn<E extends ClassResource> = {
  findOne(inputProps: QueryOneProps<E>, cacheTtl?: number): FindOneBuilder<E>;
  findAll(inputProps: QueryProps<E>, cacheTtl?: number): FindAllBuilder<E>;
  scan(inputProps?: FindProps<E>): ScanBuilder<E>;
  upsert(item: Item<E>, inputProps?: UpsertProps<E>): UpsertBuilder<E>;
  create(item: Item<E>): CreateBuilder<E>;
  update<R extends ReturnValueOption | undefined = undefined>(
    inputProps: Omit<UpdateProps<E>, 'returnValue'> & { returnValue?: R }
  ): UpdateBuilder<E, R>;
  getItem(key: TablePartition<Item<E>>, options?: GetItemOptions<E>): GetItemBuilder<E>;
  delete(key: TablePartition<Item<E>>): DeleteBuilder<E>;
  batchGet(
    keys: TablePartition<Item<E>>[],
    options?: BatchGetOptions<E>
  ): BatchGetBuilder<E>;
  bulkCreate(items: Item<E>[]): BulkCreateBuilder<E>;
  bulkDelete(keys: TablePartition<Item<E>>[]): BulkDeleteBuilder<E>;
  sendRawCommand<T = unknown>(command: Parameters<DynamoDBClient['send']>[0]): Promise<T>;
};
