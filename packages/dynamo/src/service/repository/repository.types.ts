import type { ClassResource } from '@lafken/common';
import type { ModelPartition } from '../../main';
import type {
  FindProps,
  Item,
  QueryOneProps,
  QueryProps,
  UpdateProps,
  UpsertProps,
} from '../query-builder';
import type { BulkCreateBuilder } from '../query-builder/bulk-create/bulk-create';
import type { BulkDeleteBuilder } from '../query-builder/bulk-delete/bulk-delete';
import type { CreateBuilder } from '../query-builder/create/create';
import type { DeleteBuilder } from '../query-builder/delete/delete';
import type { FindAllBuilder } from '../query-builder/find-all/find-all';
import type { FindOneBuilder } from '../query-builder/find-one/find-one';
import type { ScanBuilder } from '../query-builder/scan/scan';
import type { UpdateBuilder } from '../query-builder/update/update';
import type { UpsertBuilder } from '../query-builder/upsert/upsert';

export type RepositoryReturn<E extends ClassResource> = {
  findOne(inputProps: QueryOneProps<E>): FindOneBuilder<E>;
  findAll(inputProps: QueryProps<E>): FindAllBuilder<E>;
  scan(inputProps?: FindProps<E>): ScanBuilder<E>;
  upsert(item: Item<E>, inputProps?: UpsertProps<E>): UpsertBuilder<E>;
  create(item: Item<E>): CreateBuilder<E>;
  update(inputProps: UpdateProps<E>): UpdateBuilder<E>;
  delete(key: ModelPartition<Item<E>>): DeleteBuilder<E>;
  bulkCreate(items: Item<E>[]): BulkCreateBuilder<E>;
  bulkDelete(keys: ModelPartition<Item<E>>[]): BulkDeleteBuilder<E>;
};
