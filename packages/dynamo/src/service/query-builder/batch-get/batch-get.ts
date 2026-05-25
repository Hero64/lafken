import {
  BatchGetItemCommand,
  type BatchGetItemCommandInput,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { ClassResource } from '@lafken/common';
import { QueryBuilderBase } from '../base/base';
import type { BatchGetBuilderProps } from './batch-get.types';

export class BatchGetBuilder<E extends ClassResource> extends QueryBuilderBase<E> {
  private commands: BatchGetItemCommandInput[] = [];

  constructor(private queryOptions: BatchGetBuilderProps<E>) {
    super(queryOptions);
    this.prepare();
  }

  public getCommand() {
    return this.commands;
  }

  public then<T>(
    resolve: (value: InstanceType<E>[]) => T,
    reject: (reason: any) => T
  ): Promise<T> {
    return this.exec().then(resolve, reject);
  }

  private async exec(): Promise<InstanceType<E>[]> {
    const results = await Promise.all(
      this.commands.map((command) => this.execAndRetry(command))
    );
    return results.flat();
  }

  private async execAndRetry(
    inputCommand: BatchGetItemCommandInput,
    items: InstanceType<E>[] = [],
    attempt = 0
  ): Promise<InstanceType<E>[]> {
    const command = new BatchGetItemCommand(inputCommand);
    const { Responses = {}, UnprocessedKeys = {} } =
      await this.queryOptions.client.send(command);

    const batchItems = (Responses[this.queryOptions.modelProps.name] ?? []).map(
      (item) => unmarshall(item) as InstanceType<E>
    );
    const allItems = items.concat(batchItems);

    if (Object.keys(UnprocessedKeys).length > 0) {
      if (attempt === (this.queryOptions.options?.maxAttempt ?? 5)) {
        throw new Error('Failed to process all keys after maximum retries');
      }
      return this.execAndRetry({ RequestItems: UnprocessedKeys }, allItems, attempt + 1);
    }

    return allItems;
  }

  protected prepare() {
    const { consistentRead, projection } = this.queryOptions.options ?? {};
    const projectionExpression =
      projection && projection !== 'ALL' ? projection.join(', ') : undefined;

    const chunkedKeys = this.chunkKeys(this.queryOptions.keys, 100);

    for (const keys of chunkedKeys) {
      this.commands.push({
        RequestItems: {
          [this.queryOptions.modelProps.name]: {
            Keys: keys.map((key) =>
              marshall(key as Record<string, string>, { removeUndefinedValues: true })
            ),
            ConsistentRead: consistentRead,
            ProjectionExpression: projectionExpression,
          },
        },
      });
    }
  }

  private chunkKeys<T>(keys: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < keys.length; i += size) {
      result.push(keys.slice(i, i + size));
    }
    return result;
  }
}
