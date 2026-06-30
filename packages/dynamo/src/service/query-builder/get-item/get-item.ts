import { GetItemCommand, type GetItemCommandInput } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { ClassResource } from '@lafken/common';
import { QueryBuilderBase } from '../base/base';
import type { GetItemBuilderProps } from './get-item.types';

export class GetItemBuilder<E extends ClassResource> extends QueryBuilderBase<E> {
  protected command: GetItemCommandInput;

  constructor(private queryOptions: GetItemBuilderProps<E>) {
    super(queryOptions);
    this.prepare();
  }

  public getCommand() {
    return this.command;
  }

  public then<T>(
    resolve: (value: InstanceType<E> | undefined) => T,
    reject: (reason: any) => T
  ): Promise<T> {
    return this.exec().then(resolve, reject);
  }

  private async exec(): Promise<InstanceType<E> | undefined> {
    const { cache, options, modelProps } = this.queryOptions;
    const fetch = async () => {
      const { Item } = await this.queryOptions.client.send(
        new GetItemCommand(this.command)
      );
      return Item ? (unmarshall(Item) as InstanceType<E>) : undefined;
    };

    if (cache && options?.cacheTtl) {
      const key = JSON.stringify({ table: modelProps.name, key: this.queryOptions.key });
      return cache.getOrSet(key, fetch, options.cacheTtl);
    }

    return fetch();
  }

  protected prepare() {
    const { consistentRead, projection } = this.queryOptions.options ?? {};

    this.command = {
      TableName: this.queryOptions.modelProps.name,
      Key: marshall(this.queryOptions.key as Record<string, string>, {
        removeUndefinedValues: true,
      }),
      ConsistentRead: consistentRead,
      ProjectionExpression:
        projection && projection !== 'ALL' ? projection.join(', ') : undefined,
    };
  }
}
