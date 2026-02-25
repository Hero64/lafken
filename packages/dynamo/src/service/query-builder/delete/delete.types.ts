import type { ClassResource } from '@lafken/common';
import type { ModelPartition } from '../../../main/table';
import type { QueryBuilderProps } from '../base/base.types';
import type { Item } from '../query-builder.types';

export interface DeleteBuilderProps<E extends ClassResource>
  extends QueryBuilderProps<E> {
  key: ModelPartition<Item<E>>;
}
