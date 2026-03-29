import { DataAwsDynamodbTable } from '@cdktn/provider-aws/lib/data-aws-dynamodb-table';
import { enableBuildEnvVariable } from '@lafken/common';
import { setupTestingStack } from '@lafken/resolver';
import { Testing } from 'cdktn';
import { describe, expect, it } from 'vitest';
import { Table as Model, TableMetadataKeys } from '../../../main';
import { ExternalTable } from './external';

describe('ExternalTable', () => {
  enableBuildEnvVariable();

  it('should create an external table data source', () => {
    @Model({ isExternal: true })
    class TestTable {}

    const { stack } = setupTestingStack();
    const tableProps = Reflect.getMetadata(TableMetadataKeys.table, TestTable);
    new ExternalTable(stack, {
      isExternal: true,
      name: tableProps.name,
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveDataSource(DataAwsDynamodbTable);
  });

  it('should create an external table with the correct table name', () => {
    @Model({ isExternal: true, name: 'production-users' })
    class UsersTable {}

    const { stack } = setupTestingStack();
    const tableProps = Reflect.getMetadata(TableMetadataKeys.table, UsersTable);
    new ExternalTable(stack, {
      isExternal: true,
      name: tableProps.name,
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveDataSourceWithProperties(DataAwsDynamodbTable, {
      name: 'production-users',
    });
  });
});
