import type { ClassResource } from '@alicanto/common';
import { marshall } from '@aws-sdk/util-dynamodb';
import { BatchWriteBuilder } from '../batch-write/batch-write';
import type { BulkCreateBuilderProps } from './bulk-create.types';

export class BulkCreateBuilder<E extends ClassResource> extends BatchWriteBuilder<E> {
  constructor(queryOptions: BulkCreateBuilderProps<E>) {
    super({
      ...queryOptions,
      generateBatchCommand: (items) => {
        return {
          RequestItems: {
            [queryOptions.modelProps.name]: items.map((item) => {
              return {
                PutRequest: {
                  Item: marshall(item),
                },
              };
            }),
          },
        };
      },
    });
  }
}
