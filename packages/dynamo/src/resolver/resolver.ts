import type { DynamodbTable } from '@cdktn/provider-aws/lib/dynamodb-table';
import type { ClassResource } from '@lafken/common';
import type { AppModule, AppStack, ResolverType } from '@lafken/resolver';
import type { ClassResourceExtends } from './resolver.types';
import { Table } from './table/table';

export class DynamoResolver implements ResolverType {
  public type = 'DYNAMODB';
  private extensibleTables: (Omit<ClassResourceExtends, 'table'> & {
    table: DynamodbTable;
  })[] = [];

  constructor(private tables: (ClassResource | ClassResourceExtends)[]) {}

  public beforeCreate(scope: AppModule) {
    for (const table of this.tables) {
      const isExtensibleResource = 'table' in table;
      const tableResource = isExtensibleResource ? table.table : table;

      const dynamoTable = new Table(scope, {
        classResource: tableResource,
      });

      if (isExtensibleResource) {
        this.extensibleTables.push({
          table: dynamoTable,
          extends: table.extends,
        });
      }
    }
  }

  public create() {
    throw new Error('It is not possible to parse this service');
  }

  public afterCreate(scope: AppStack) {
    for (const extendTable of this.extensibleTables) {
      extendTable.extends({
        scope,
        table: extendTable.table,
      });
    }
  }
}
