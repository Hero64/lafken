import type { ClassResource } from '@alicanto/common';
import { PutItemCommand, type PutItemCommandInput } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

import { QueryBuilderBase } from '../base/base';
import type { UpsertBuilderProps } from './upsert.types';

export class UpsertBuilder<E extends ClassResource> extends QueryBuilderBase<E> {
  protected command: PutItemCommandInput;

  constructor(private queryOptions: UpsertBuilderProps<E>) {
    super(queryOptions);
    this.prepare();
  }

  public getCommand() {
    return this.command;
  }

  public async exec() {
    const command = new PutItemCommand(this.command);

    await this.queryOptions.client.send(command);
    return this.queryOptions.item;
  }

  protected prepare() {
    const { condition } = this.queryOptions.inputProps;
    let conditionExpression: string | undefined;

    if (condition) {
      conditionExpression = this.getFilterExpression(condition);
    }

    this.command = {
      TableName: this.queryOptions.modelProps.name,
      Item: marshall(this.queryOptions.item),
      ConditionExpression: conditionExpression,
      ...this.getAttributesAndNames(),
    };
  }
}
