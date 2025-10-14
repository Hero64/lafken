import type { ClassResource } from '@alicanto/common';
import type { AppModule, ResolverType } from '@alicanto/resolver';
import { Table } from './table/table';

export class DynamoResolver implements ResolverType {
  public type = 'DYNAMODB';

  constructor(private models: ClassResource[]) {}

  public async beforeCreate(scope: AppModule) {
    for (const bucket of this.models) {
      new Table(scope, {
        classResource: bucket,
      });
    }
  }

  public async create() {
    throw new Error('It is not possible to parse this service');
  }
}
