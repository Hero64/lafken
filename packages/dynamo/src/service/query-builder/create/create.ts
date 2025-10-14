import type { ClassResource } from '@alicanto/common';
import type { Filter, NullExpression } from '../query-builder.types';
import { UpsertBuilder } from '../upsert/upsert';
import type { CreateBuilderProps } from './create.types';

export class CreateBuilder<E extends ClassResource> extends UpsertBuilder<E> {
  constructor(queryOptions: CreateBuilderProps<E>) {
    const notExist: NullExpression = {
      notExist: true,
    };

    const filter = {
      [queryOptions.partitionKey]: notExist,
      ...(queryOptions.sortKey ? { [queryOptions.sortKey]: notExist } : {}),
    } as Filter<E>;

    super({
      ...queryOptions,
      inputProps: {
        condition: filter,
      },
    });
  }
}
