import type { ClassResource } from '@alicanto/common';
import {
  BatchWriteItemCommand,
  type BatchWriteItemCommandInput,
} from '@aws-sdk/client-dynamodb';

import { QueryBuilderBase } from '../base/base';
import type { BatchWriteBuilderProps } from './batch-write.types';

export class BatchWriteBuilder<E extends ClassResource> extends QueryBuilderBase<E> {
  private commands: BatchWriteItemCommandInput[] = [];

  constructor(private queryOptions: BatchWriteBuilderProps<E>) {
    super(queryOptions);
    this.prepare();
  }

  public getCommand() {
    return this.commands;
  }

  public async exec() {
    return Promise.all(this.commands.map((command) => this.execAndRetry(command)));
  }

  private async execAndRetry(inputCommand: BatchWriteItemCommandInput, attempt = 0) {
    const command = new BatchWriteItemCommand(inputCommand);
    const response = await this.queryOptions.client.send(command);

    const unprocessedItems = response.UnprocessedItems || {};

    if (Object.keys(unprocessedItems).length > 0) {
      if (attempt === (this.queryOptions.maxAttempt ?? 5)) {
        throw new Error('Failed to process all items after maximum retries');
      }
      await this.execAndRetry(
        {
          RequestItems: unprocessedItems,
        },
        attempt + 1
      );
    }
  }

  protected chunkItems<T>(items: Partial<T>[], size: number) {
    const result: Partial<T>[][] = [];
    const total = items.length;
    for (let i = 0; i < total; i += size) {
      result.push(items.slice(i, i + size));
    }
    return result;
  }

  private prepare() {
    const chunkedItems = this.chunkItems(this.queryOptions.items, 25);

    for (const items of chunkedItems) {
      this.commands.push(this.queryOptions.generateBatchCommand(items));
    }
  }
}
