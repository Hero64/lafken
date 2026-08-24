import type { ClassResource } from '@lafken/common';
import { FindBuilder } from '../find/find';
import type { QueryResponse } from '../query-builder.types';
import type { FindAllBuilderProps } from './find-all.types';

export class FindAllBuilder<E extends ClassResource> extends FindBuilder<E> {
  constructor(protected queryOptions: FindAllBuilderProps<E>) {
    super(queryOptions);
  }

  public then<T>(
    resolve: (value: QueryResponse<E>) => T,
    reject: (reason: any) => T
  ): Promise<T> {
    return this.exec().then(resolve, reject);
  }

  private async exec(): Promise<QueryResponse<E>> {
    const { cache, cacheTtl, modelProps, inputProps } = this.queryOptions;
    const fetch = () => this.runQuery(this.command);

    if (cache && cacheTtl) {
      const key = JSON.stringify({ table: modelProps.name, inputProps });
      return cache.getOrSet(key, fetch, cacheTtl);
    }

    return fetch();
  }
}
