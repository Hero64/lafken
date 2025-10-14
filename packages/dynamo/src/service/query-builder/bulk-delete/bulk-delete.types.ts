import type { ClassResource } from '@alicanto/common';
import type { ModelPartition } from '../../../main/model';
import type { BatchWriteBuilderProps } from '../batch-write/batch-write.types';
import type { Item } from '../query-builder.types';

export interface BulkDeleteBuilderProps<E extends ClassResource>
  extends Omit<BatchWriteBuilderProps<E>, 'generateBatchCommand' | 'items'> {
  keys: ModelPartition<Item<E>>[];
}
