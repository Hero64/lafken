import type { ClassResource } from '@alicanto/common';
import type { BatchWriteItemCommandInput } from '@aws-sdk/client-dynamodb';

import type { QueryBuilderProps } from '../base/base.types';
import type { Item } from '../query-builder.types';

export interface BatchWriteBuilderProps<E extends ClassResource>
  extends QueryBuilderProps<E> {
  items: Partial<Item<E>>[];
  maxAttempt?: number;
  generateBatchCommand: (items: Partial<Item<E>>[]) => BatchWriteItemCommandInput;
}
