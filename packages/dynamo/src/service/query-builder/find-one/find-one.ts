import type { ClassResource } from '@alicanto/common';
import { FindBuilder } from '../find/find';
import type { FindBuilderProps } from '../find/find.types';

export class FindOneBuilder<E extends ClassResource> extends FindBuilder<E> {
  constructor(protected queryOptions: FindBuilderProps<E>) {
    super(queryOptions);
    this.find();
  }

  public async exec() {
    const { data } = await this.runQuery(this.command);

    return data?.[0];
  }
}
