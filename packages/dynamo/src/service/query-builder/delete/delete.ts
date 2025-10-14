import type { ClassResource } from '@alicanto/common';
import { DeleteItemCommand, type DeleteItemCommandInput } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { QueryBuilderBase } from '../base/base';
import type { DeleteBuilderProps } from './delete.types';

export class DeleteBuilder<E extends ClassResource> extends QueryBuilderBase<E> {
  protected command: DeleteItemCommandInput;

  constructor(private queryOptions: DeleteBuilderProps<E>) {
    super(queryOptions);
    this.prepare();
  }

  public getCommand() {
    return this.command;
  }

  public async exec() {
    const command = new DeleteItemCommand(this.command);

    await this.queryOptions.client.send(command);
    return true;
  }

  protected prepare() {
    this.command = {
      TableName: this.queryOptions.modelProps.name,
      Key: marshall(this.queryOptions.key as Record<string, string>),
    };
  }
}
