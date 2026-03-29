import 'reflect-metadata';

import { DynamodbTable } from '@cdktn/provider-aws/lib/dynamodb-table';
import { PipesPipe } from '@cdktn/provider-aws/lib/pipes-pipe';
import { enableBuildEnvVariable } from '@lafken/common';
import { TerraformStack, Testing } from 'cdktn';
import { describe, expect, it } from 'vitest';
import {
  Field,
  Table as Model,
  PartitionKey,
  type PrimaryPartition,
  SortKey,
} from '../../../main';
import { InternalTable } from './internal';

const setupApp = () => {
  const app = Testing.app();
  const stack = new TerraformStack(app, 'testing-stack');

  return {
    app,
    stack,
  };
};

describe('InternalTable', () => {
  enableBuildEnvVariable();

  it('should create a simple dynamo table', () => {
    @Model()
    class Test {
      @PartitionKey(String)
      name: PrimaryPartition<string>;

      @SortKey(Number)
      age: PrimaryPartition<number>;
    }

    const { stack } = setupApp();

    new InternalTable(stack, {
      classResource: Test,
    });

    const synthesized = Testing.synth(stack);
    expect(synthesized).toHaveResourceWithProperties(DynamodbTable, {
      name: 'Test',
    });
  });

  it('should create a simple dynamo table with ttl', () => {
    @Model({
      ttl: 'ttl',
    })
    class Test {
      @PartitionKey(String)
      name: PrimaryPartition<string>;

      @Field()
      ttl: number;
    }

    const { stack } = setupApp();

    new InternalTable(stack, {
      classResource: Test,
    });

    const synthesized = Testing.synth(stack);
    expect(synthesized).toHaveResourceWithProperties(DynamodbTable, {
      name: 'Test',
      hash_key: 'name',
      attribute: [
        {
          name: 'name',
          type: 'S',
        },
      ],
      ttl: {
        attribute_name: 'ttl',
        enabled: true,
      },
    });
  });

  it('should create a simple dynamo table with indexes', () => {
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
    class Test {
      @PartitionKey(String)
      name: PrimaryPartition<string>;

      @SortKey(String)
      other: PrimaryPartition<string>;

      @Field()
      age: number;
    }

    const { stack } = setupApp();

    new InternalTable(stack, {
      classResource: Test,
    });

    const synthesized = Testing.synth(stack);
    expect(synthesized).toHaveResourceWithProperties(DynamodbTable, {
      name: 'Test',
      hash_key: 'name',
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

  it('should create a simple dynamo table with stream', () => {
    @Model({
      stream: {
        enabled: true,
      },
    })
    class Test {
      @PartitionKey(String)
      name: PrimaryPartition<string>;
    }

    const { stack } = setupApp();

    new InternalTable(stack, {
      classResource: Test,
    });

    const synthesized = Testing.synth(stack);
    expect(synthesized).toHaveResourceWithProperties(DynamodbTable, {
      name: 'Test',
      hash_key: 'name',
      stream_enabled: true,
      stream_view_type: 'NEW_AND_OLD_IMAGES',
    });

    expect(synthesized).toHaveResourceWithProperties(PipesPipe, {
      desired_state: 'RUNNING',
      name: 'Test-pipe',
      source: '${aws_dynamodb_table.Test-table.stream_arn}',
      source_parameters: {
        dynamodb_stream_parameters: {
          batch_size: 10,
          maximum_batching_window_in_seconds: 1,
          maximum_record_age_in_seconds: -1,
          starting_position: 'LATEST',
        },
      },
      target: '${data.aws_cloudwatch_event_bus.Test-table_DefaultBus_10907519.arn}',
      target_parameters: {
        eventbridge_event_bus_parameters: {
          detail_type: 'db:stream',
          source: 'dynamodb.Test',
        },
      },
    });
  });

  it('should validate local secondary index without sort key', () => {
    @Model({
      indexes: [
        {
          name: 'age_local_index',
          type: 'local',
          sortKey: 'age',
        },
      ],
    })
    class Test {
      @PartitionKey(String)
      name: PrimaryPartition<string>;

      @Field()
      age: number;
    }
    const { stack } = setupApp();

    expect(() => {
      new InternalTable(stack, {
        classResource: Test,
      });
    }).toThrow();
  });
});
