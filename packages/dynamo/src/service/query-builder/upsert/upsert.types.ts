import type { ClassResource } from '@alicanto/common';
import type { QueryBuilderProps } from '../base/base.types';
import type { Item, UpsertProps } from '../query-builder.types';

export interface UpsertBuilderProps<E extends ClassResource>
  extends QueryBuilderProps<E> {
  item: Item<E>;
  inputProps: UpsertProps<E>;
}
