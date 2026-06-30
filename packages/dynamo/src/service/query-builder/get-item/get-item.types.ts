import type { ClassResource } from '@lafken/common';
import type { TablePartition } from '../../../main/table';
import type { InMemoryCache } from '../../cache/in-memory-cache';
import type { QueryBuilderProps } from '../base/base.types';
import type { Item, Projection } from '../query-builder.types';

export interface GetItemOptions<E extends ClassResource> {
  consistentRead?: boolean;
  projection?: Projection<E>;
  cacheTtl?: number;
}

export interface GetItemBuilderProps<E extends ClassResource>
  extends QueryBuilderProps<E> {
  key: TablePartition<Item<E>>;
  cache?: InMemoryCache;
  options?: GetItemOptions<E>;
}
