import type { ClassResource } from '@lafken/common';
import { FindBuilder } from '../find/find';
import type { FindBuilderProps } from '../find/find.types';

export class FindOneBuilder<E extends ClassResource> extends FindBuilder<E> {
  constructor(protected queryOptions: FindBuilderProps<E>) {
    super(queryOptions);
    this.find();
  }

  public then<T>(
    resolve: (value: InstanceType<E> | undefined) => T,
    reject: (reason: any) => T
  ): Promise<T> {
    return this.exec().then(resolve, reject);
  }

  private async exec(): Promise<InstanceType<E> | undefined> {
    const { data } = await this.runQuery(this.command);

    return (data as E[])?.[0] as InstanceType<E> | undefined;
  }
}
