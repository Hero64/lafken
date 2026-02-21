import { describe, expect, it } from 'vitest';
import type { ModelMetadata } from '../../service';
import { Field, Model, PartitionKey, SortKey } from './model';
import { type FieldsMetadata, ModelMetadataKeys } from './model.types';

describe('Model decorators', () => {
  it('should exist model resource metadata', () => {
    @Model({
      name: 'test-model',
    })
    class Table {}

    const metadata: ModelMetadata<typeof Table> = Reflect.getMetadata(
      ModelMetadataKeys.model,
      Table
    );

    expect(metadata).toStrictEqual({ name: 'test-model', indexes: [] });
  });

  it('should exist fields metadata', () => {
    @Model({
      name: 'test-model',
    })
    class Table {
      @Field()
      name: string;

      @Field()
      lastName: string;
    }

    const fields: FieldsMetadata = Reflect.getMetadata(
      ModelMetadataKeys.fields,
      Table.prototype
    );

    expect(fields).toStrictEqual({
      name: { name: 'name', type: 'String' },
      lastName: { name: 'lastName', type: 'String' },
    });
  });

  it('should exist partition key metadata', () => {
    @Model({
      name: 'test-model',
    })
    class Table {
      @PartitionKey(String)
      name: string;
    }

    const partitionKey: string = Reflect.getMetadata(
      ModelMetadataKeys.partition_key,
      Table.prototype
    );

    expect(partitionKey).toEqual('name');
  });

  it('should exist sort key metadata', () => {
    @Model({
      name: 'test-model',
    })
    class Table {
      @SortKey(String)
      name: string;
    }

    const sortKey: string = Reflect.getMetadata(
      ModelMetadataKeys.sort_key,
      Table.prototype
    );

    expect(sortKey).toEqual('name');
  });
});
