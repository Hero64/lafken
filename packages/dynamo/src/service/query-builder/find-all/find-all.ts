import type { ClassResource } from '@alicanto/common';
import { FindBuilder } from '../find/find';
import type { FindBuilderProps } from '../find/find.types';

export class FindAllBuilder<E extends ClassResource> extends FindBuilder<E> {
  constructor(protected queryOptions: FindBuilderProps<E>) {
    super(queryOptions);
    this.find();
  }

  public async exec() {
    return this.runQuery(this.command);
  }
}
