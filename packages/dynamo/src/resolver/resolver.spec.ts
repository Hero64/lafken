import { DataAwsDynamodbTable } from '@cdktn/provider-aws/lib/data-aws-dynamodb-table';
import { DynamodbTable } from '@cdktn/provider-aws/lib/dynamodb-table';
import { PipesPipe } from '@cdktn/provider-aws/lib/pipes-pipe';
import { enableBuildEnvVariable } from '@lafken/common';
import { type AppModule, type AppStack, setupTestingStack } from '@lafken/resolver';
import { Testing } from 'cdktn';
import { describe, expect, it, vi } from 'vitest';
import {
  Field,
  Table as Model,
  PartitionKey,
  type PrimaryPartition,
  SortKey,
} from '../main';
import { DynamoResolver } from './resolver';

describe('dynamo resolver', () => {
  enableBuildEnvVariable();

  describe('beforeCreate', () => {
    it('should create a simple dynamo table', async () => {
      @Model()
      class Test {
        @PartitionKey(String)
        name: PrimaryPartition<string>;
      }

      const { stack } = setupTestingStack();
      const resolver = new DynamoResolver([Test]);

      await resolver.beforeCreate(stack as unknown as AppModule);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(DynamodbTable, {
        name: 'Test',
      });
    });

    it('should create a dynamo table with partition and sort key', async () => {
      @Model()
      class TestWithKeys {
        @PartitionKey(String)
        name: PrimaryPartition<string>;

        @SortKey(Number)
        age: PrimaryPartition<number>;
      }

      const { stack } = setupTestingStack();
      const resolver = new DynamoResolver([TestWithKeys]);

      await resolver.beforeCreate(stack as unknown as AppModule);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(DynamodbTable, {
        name: 'TestWithKeys',
        hash_key: 'name',
        range_key: 'age',
      });
    });

    it('should create multiple dynamo tables', async () => {
      @Model()
      class Users {
        @PartitionKey(String)
        id: PrimaryPartition<string>;
      }

      @Model()
      class Orders {
        @PartitionKey(String)
        orderId: PrimaryPartition<string>;
      }

      const { stack } = setupTestingStack();
      const resolver = new DynamoResolver([Users, Orders]);

      await resolver.beforeCreate(stack as unknown as AppModule);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(DynamodbTable, {
        name: 'Users',
      });
      expect(synthesized).toHaveResourceWithProperties(DynamodbTable, {
        name: 'Orders',
      });
    });

    it('should create a dynamo table with ttl', async () => {
      @Model({
        ttl: 'ttl',
      })
      class TestTtl {
        @PartitionKey(String)
        name: PrimaryPartition<string>;

        @Field()
        ttl: number;
      }

      const { stack } = setupTestingStack();
      const resolver = new DynamoResolver([TestTtl]);

      await resolver.beforeCreate(stack as unknown as AppModule);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(DynamodbTable, {
        name: 'TestTtl',
        ttl: {
          attribute_name: 'ttl',
          enabled: true,
        },
      });
    });

    it('should create a dynamo table with stream', async () => {
      @Model({
        stream: {
          enabled: true,
        },
      })
      class TestStream {
        @PartitionKey(String)
        name: PrimaryPartition<string>;
      }

      const { stack } = setupTestingStack();
      const resolver = new DynamoResolver([TestStream]);

      await resolver.beforeCreate(stack as unknown as AppModule);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(DynamodbTable, {
        name: 'TestStream',
        stream_enabled: true,
        stream_view_type: 'NEW_AND_OLD_IMAGES',
      });
      expect(synthesized).toHaveResourceWithProperties(PipesPipe, {
        desired_state: 'RUNNING',
        name: 'TestStream-pipe',
      });
    });

    it('should create a dynamo table with indexes', async () => {
      @Model({
        indexes: [
          {
            name: 'age_name_index',
            partitionKey: 'age',
            sortKey: 'name',
          },
          {
            type: 'local',
            name: 'name_age_index',
            sortKey: 'age',
          },
        ],
      })
      class TestIndexes {
        @PartitionKey(String)
        name: PrimaryPartition<string>;

        @SortKey(String)
        other: PrimaryPartition<string>;

        @Field()
        age: number;
      }

      const { stack } = setupTestingStack();
      const resolver = new DynamoResolver([TestIndexes]);

      await resolver.beforeCreate(stack as unknown as AppModule);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(DynamodbTable, {
        name: 'TestIndexes',
        global_secondary_index: [
          {
            hash_key: 'age',
            name: 'age_name_index',
            projection_type: 'ALL',
            range_key: 'name',
          },
        ],
        local_secondary_index: [
          {
            name: 'name_age_index',
            projection_type: 'ALL',
            range_key: 'age',
          },
        ],
      });
    });

    it('should create a dynamo table with extensible resource', async () => {
      @Model()
      class TestExtend {
        @PartitionKey(String)
        name: PrimaryPartition<string>;
      }

      const extendFn = vi.fn();

      const { stack } = setupTestingStack();
      const resolver = new DynamoResolver([
        {
          table: TestExtend,
          extends: extendFn,
        },
      ]);

      await resolver.beforeCreate(stack as unknown as AppModule);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(DynamodbTable, {
        name: 'TestExtend',
      });
    });

    it('should create an external dynamo table', async () => {
      @Model({ isExternal: true })
      class ExternalTest {}

      const { stack } = setupTestingStack();
      const resolver = new DynamoResolver([ExternalTest]);

      await resolver.beforeCreate(stack as unknown as AppModule);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveDataSourceWithProperties(DataAwsDynamodbTable, {
        name: 'ExternalTest',
      });
    });

    it('should create both internal and external dynamo tables', async () => {
      @Model()
      class InternalTest {
        @PartitionKey(String)
        name: PrimaryPartition<string>;
      }

      @Model({ isExternal: true })
      class ExternalTest {}

      const { stack } = setupTestingStack();
      const resolver = new DynamoResolver([InternalTest, ExternalTest]);

      await resolver.beforeCreate(stack as unknown as AppModule);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(DynamodbTable, {
        name: 'InternalTest',
      });
      expect(synthesized).toHaveDataSourceWithProperties(DataAwsDynamodbTable, {
        name: 'ExternalTest',
      });
    });
  });

  describe('create', () => {
    it('should throw error when create is called', () => {
      const resolver = new DynamoResolver([]);

      expect(() => {
        resolver.create();
      }).toThrow('It is not possible to parse this service');
    });
  });

  describe('afterCreate', () => {
    it('should call extend callback for extensible tables', async () => {
      @Model()
      class TestAfter {
        @PartitionKey(String)
        name: PrimaryPartition<string>;
      }

      const extendFn = vi.fn();

      const { stack } = setupTestingStack();
      const resolver = new DynamoResolver([
        {
          table: TestAfter,
          extends: extendFn,
        },
      ]);

      await resolver.beforeCreate(stack as unknown as AppModule);
      await resolver.afterCreate(stack as unknown as AppStack);

      Testing.synth(stack);

      expect(extendFn).toHaveBeenCalledTimes(1);
      expect(extendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: stack,
          table: expect.anything(),
        })
      );
    });

    it('should not fail when there are no extensible tables', async () => {
      @Model()
      class TestNoExtend {
        @PartitionKey(String)
        name: PrimaryPartition<string>;
      }

      const { stack } = setupTestingStack();
      const resolver = new DynamoResolver([TestNoExtend]);

      await resolver.beforeCreate(stack as unknown as AppModule);
      await resolver.afterCreate(stack as unknown as AppStack);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(DynamodbTable, {
        name: 'TestNoExtend',
      });
    });
  });
});
