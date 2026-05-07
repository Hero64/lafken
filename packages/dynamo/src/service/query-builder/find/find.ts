import { QueryCommand, type QueryCommandInput } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { ClassResource } from '@lafken/common';

import { QueryBuilderBase } from '../base/base';
import type { QueryResponse } from '../query-builder.types';
import type { FindBuilderProps } from './find.types';

export class FindBuilder<E extends ClassResource> extends QueryBuilderBase<E> {
  protected command: QueryCommandInput;

  constructor(protected queryOptions: FindBuilderProps<E>) {
    super(queryOptions);
    this.find();
  }

  public getCommand() {
    return this.command;
  }

  protected find() {
    const {
      limit,
      cursor,
      keyCondition,
      filter,
      projection = 'ALL',
      sortDirection = 'asc',
    } = this.queryOptions.inputProps;

    const index = this.queryOptions.indexes.getIndex(this.queryOptions.inputProps);
    const keyConditionExpression = this.getKeyConditionExpression(keyCondition, index);

    let filterExpression: string | undefined;
    if (filter) {
      const expression = this.getFilterExpression(filter || {});
      filterExpression = expression;
    }

    this.command = {
      TableName: this.queryOptions.modelProps.name,
      IndexName: index?.name,
      KeyConditionExpression: keyConditionExpression,
      FilterExpression: filterExpression,
      ExclusiveStartKey: cursor
        ? marshall(cursor, { removeUndefinedValues: true })
        : undefined,
      Limit: limit,
      ScanIndexForward: sortDirection === 'asc',
      ProjectionExpression: projection === 'ALL' ? undefined : projection.join(', '),
      ...this.getAttributesAndNames(),
    };
  }

  protected async runQuery(
    input: QueryCommandInput,
    data: Partial<E[]> = []
  ): Promise<QueryResponse<E>> {
    const command = new QueryCommand(input);
    const { Items = [], LastEvaluatedKey } = await this.queryOptions.client.send(command);
    const resultData = Items.map((item) => unmarshall(item)) as E[];

    if (input.Limit === 1) {
      return {
        data: [resultData[0]],
        cursor: LastEvaluatedKey ? unmarshall(LastEvaluatedKey) : undefined,
      };
    }

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
