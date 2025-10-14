import type { ClassResource } from '@alicanto/common';
import { marshall } from '@aws-sdk/util-dynamodb';
import { BatchWriteBuilder } from '../batch-write/batch-write';
import type { Item } from '../query-builder.types';
import type { BulkDeleteBuilderProps } from './bulk-delete.types';

export class BulkDeleteBuilder<E extends ClassResource> extends BatchWriteBuilder<E> {
  constructor(queryOptions: BulkDeleteBuilderProps<E>) {
    super({
      ...queryOptions,
      items: queryOptions.keys as unknown as Partial<Item<E>>[],
      generateBatchCommand: (items) => {
        return {
          RequestItems: {
            [queryOptions.modelProps.name]: items.map((item) => {
              return {
                DeleteRequest: {
                  Key: marshall(item),
                },
              };
            }),
          },
        };
      },
    });
  }
}
