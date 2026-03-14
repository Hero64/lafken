import type { ClassResource } from '@lafken/common';
import { FindBuilder } from '../find/find';
import type { FindBuilderProps } from '../find/find.types';
import type { QueryResponse } from '../query-builder.types';

export class FindAllBuilder<E extends ClassResource> extends FindBuilder<E> {
  constructor(protected queryOptions: FindBuilderProps<E>) {
    super(queryOptions);
    this.find();
  }

  public then<T>(
    resolve: (value: QueryResponse<E>) => T,
    reject: (reason: any) => T
  ): Promise<T> {
    return this.exec().then(resolve, reject);
  }

  private async exec() {
    return this.runQuery(this.command);
  }
}
