import { describe, expect, it } from 'vitest';
import type { ModelMetadata } from '../../service';
import { Field, PartitionKey, SortKey, Table } from './table';
import { type FieldsMetadata, TableMetadataKeys } from './table.types';

describe('Model decorators', () => {
  it('should exist model resource metadata', () => {
    @Table({
      name: 'test-model',
    })
    class Example {}

    const metadata: ModelMetadata<typeof Example> = Reflect.getMetadata(
      TableMetadataKeys.table,
      Example
    );

    expect(metadata).toStrictEqual({ name: 'test-model', indexes: [] });
  });

  it('should exist fields metadata', () => {
    @Table({
      name: 'test-model',
    })
    class Example {
      @Field()
      name: string;

      @Field()
      lastName: string;
    }

    const fields: FieldsMetadata = Reflect.getMetadata(
      TableMetadataKeys.fields,
      Example.prototype
    );

    expect(fields).toStrictEqual({
      name: { name: 'name', type: 'String' },
      lastName: { name: 'lastName', type: 'String' },
    });
  });

  it('should exist partition key metadata', () => {
    @Table({
      name: 'test-model',
    })
    class Example {
      @PartitionKey(String)
      name: string;
    }

    const partitionKey: string = Reflect.getMetadata(
      TableMetadataKeys.partition_key,
      Example.prototype
    );

    expect(partitionKey).toEqual('name');
  });

  it('should exist sort key metadata', () => {
    @Table({
      name: 'test-model',
    })
    class Example {
      @SortKey(String)
      name: string;
    }

    const sortKey: string = Reflect.getMetadata(
      TableMetadataKeys.sort_key,
      Example.prototype
    );

    expect(sortKey).toEqual('name');
  });
});
