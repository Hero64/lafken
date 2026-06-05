import type { ClassResource } from '@lafken/common';
import { FindBuilder } from '../find/find';
import type { FindOneBuilderProps } from './find-one.types';

export class FindOneBuilder<E extends ClassResource> extends FindBuilder<E> {
  constructor(protected queryOptions: FindOneBuilderProps<E>) {
    super(queryOptions);
  }

  public then<T>(
    resolve: (value: InstanceType<E> | undefined) => T,
    reject: (reason: any) => T
  ): Promise<T> {
    return this.exec().then(resolve, reject);
  }

  private async exec(): Promise<InstanceType<E> | undefined> {
    const { cache, cacheTtl, modelProps, inputProps } = this.queryOptions;
    const fetch = async () => {
      const { data } = await this.runQuery(this.command);
      return (data as E[])?.[0] as InstanceType<E> | undefined;
    };

    if (cache && cacheTtl) {
      const key = JSON.stringify({ table: modelProps.name, inputProps });
      return cache.getOrSet(key, fetch, cacheTtl);
    }

    return fetch();
  }
}
