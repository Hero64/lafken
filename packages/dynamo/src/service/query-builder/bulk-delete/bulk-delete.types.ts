import type { ClassResource } from '@lafken/common';
import type { TablePartition } from '../../../main/table';
import type { BatchWriteBuilderProps } from '../batch-write/batch-write.types';
import type { Item } from '../query-builder.types';

export interface BulkDeleteBuilderProps<E extends ClassResource>
  extends Omit<BatchWriteBuilderProps<E>, 'generateBatchCommand' | 'items'> {
  keys: TablePartition<Item<E>>[];
}
