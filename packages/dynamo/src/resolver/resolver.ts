import type { DataAwsDynamodbTable } from '@cdktn/provider-aws/lib/data-aws-dynamodb-table';
import type { DynamodbTable } from '@cdktn/provider-aws/lib/dynamodb-table';
import type { ClassResource } from '@lafken/common';
import type { AppModule, AppStack, ResolverType } from '@lafken/resolver';
import { type TableMetadata, TableMetadataKeys } from '../main';
import type { ClassResourceExtends } from './resolver.types';
import { ExternalTable } from './table/external/external';
import { InternalTable } from './table/internal/internal';

export class DynamoResolver implements ResolverType {
  public type = 'DYNAMODB';
  private extensibleTables: (Omit<ClassResourceExtends, 'table'> & {
    table: DynamodbTable | DataAwsDynamodbTable;
  })[] = [];

  constructor(private tables: (ClassResource | ClassResourceExtends)[]) {}

  public beforeCreate(scope: AppModule) {
    for (const table of this.tables) {
      const isExtensibleResource = 'table' in table;
      const tableResource = isExtensibleResource ? table.table : table;

      const tableProps: TableMetadata = Reflect.getMetadata(
        TableMetadataKeys.table,
        tableResource
      );

      let dynamoTable: InternalTable | ExternalTable;

      if (tableProps.isExternal !== undefined) {
        dynamoTable = new ExternalTable(scope, tableProps);
      } else {
        dynamoTable = new InternalTable(scope, {
          classResource: tableResource,
        });
      }

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
