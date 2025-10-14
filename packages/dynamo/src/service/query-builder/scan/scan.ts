import type { ClassResource } from '@alicanto/common';
import { ScanCommand, type ScanCommandInput } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { QueryBuilderBase } from '../base/base';
import type { QueryResponse } from '../query-builder.types';
import type { ScanBuilderProps } from './scan.types';

export class ScanBuilder<E extends ClassResource> extends QueryBuilderBase<E> {
  protected command: ScanCommandInput;

  constructor(protected queryOptions: ScanBuilderProps<E>) {
    super(queryOptions);
    this.scan();
  }

  public getCommand() {
    return this.command;
  }

  public exec() {
    return this.runQuery(this.command);
  }

  private scan() {
    const { limit, cursor, filter, projection = 'ALL' } = this.queryOptions.inputProps;

    let filterExpression: string | undefined;
    if (filter) {
      filterExpression = this.getFilterExpression(filter || {});
    }

    this.command = {
      TableName: this.queryOptions.modelProps.name,
      FilterExpression: filterExpression,
      ExclusiveStartKey: cursor ? marshall(cursor) : undefined,
      Limit: limit,
      ProjectionExpression: projection === 'ALL' ? undefined : projection.join(', '),
      ...this.getAttributesAndNames(),
    };
  }

  private async runQuery(
    input: ScanCommandInput,
    data: Partial<E[]> = []
  ): Promise<QueryResponse<E>> {
    const command = new ScanCommand(input);
    const { Items = [], LastEvaluatedKey } = await this.queryOptions.client.send(command);
    const resultData = Items.map((item) => unmarshall(item)) as E[];

    const items = data.concat(resultData);
    if (LastEvaluatedKey && (!input.Limit || items.length < input.Limit)) {
      return this.runQuery(
        {
          ...input,
          ExclusiveStartKey: LastEvaluatedKey,
          Limit: input.Limit ? input.Limit - items.length : undefined,
        },
        items
      );
    }

    return {
      data: items as E[],
      cursor: LastEvaluatedKey ? unmarshall(LastEvaluatedKey) : undefined,
    };
  }
}
