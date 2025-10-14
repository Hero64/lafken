import type { ClassResource } from '@alicanto/common';

import type { BatchWriteBuilderProps } from '../batch-write/batch-write.types';

export interface BulkCreateBuilderProps<E extends ClassResource>
  extends Omit<BatchWriteBuilderProps<E>, 'generateBatchCommand'> {}
