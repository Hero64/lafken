import type { ClassResource } from '@lafken/common';
import type { TablePartition } from '../../../main/table';
import type { QueryBuilderProps } from '../base/base.types';
import type { Item, Projection } from '../query-builder.types';

export interface BatchGetOptions<E extends ClassResource> {
  consistentRead?: boolean;
  projection?: Projection<E>;
  maxAttempt?: number;
}

export interface BatchGetBuilderProps<E extends ClassResource>
  extends QueryBuilderProps<E> {
  keys: TablePartition<Item<E>>[];
  options?: BatchGetOptions<E>;
}
