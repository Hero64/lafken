import { DeleteItemCommand, type DeleteItemCommandInput } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import type { ClassResource } from '@lafken/common';
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

  public then<T>(resolve: (value: boolean) => T, reject: (reason: any) => T): Promise<T> {
    return this.exec().then(resolve, reject);
  }

  private async exec() {
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
