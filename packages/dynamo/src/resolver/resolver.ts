import type { ClassResource } from '@lafken/common';
import type { AppModule, ResolverType } from '@lafken/resolver';
import { Table } from './table/table';

export class DynamoResolver implements ResolverType {
  public type = 'DYNAMODB';

  constructor(private tables: ClassResource[]) {}

  public beforeCreate(scope: AppModule) {
    for (const bucket of this.tables) {
      new Table(scope, {
        classResource: bucket,
      });
    }
  }

  public create() {
    throw new Error('It is not possible to parse this service');
  }
}
