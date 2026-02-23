import { describe, expect, it } from 'vitest';
import { DynamoIndexes } from './dynamo-index';

describe('Dynamo Index', () => {
  it('should not return an index.', () => {
    const dynamoIndexes = new DynamoIndexes([], 'name');

    const index = dynamoIndexes.getIndex({
      keyCondition: {
        partition: {
          name: 'foo',
        },
      },
    });

    expect(index).toBeUndefined();
  });

  it('should return a local index', () => {
    const dynamoIndexes = new DynamoIndexes(
      [
        {
          type: 'local',
          name: 'local_age_index',
          sortKey: 'age',
        },
        {
          type: 'local',
          name: 'local_email_index',
          sortKey: 'email',
        },
      ],
      'name'
    );

    const index = dynamoIndexes.getIndex({
      keyCondition: {
        partition: {
          name: 'foo',
        },
        sort: {
          age: 10,
        },
      },
    });

    expect(index).toBeDefined();
    expect(index?.name).toBe('local_age_index');
  });

  it('should return a global index', () => {
    const dynamoIndexes = new DynamoIndexes(
      [
        {
          type: 'global',
          name: 'global_multi_attribute_index',
          partitionKey: ['name', 'email'],
          sortKey: ['age', 'other'],
        },
        {
          type: 'local',
          name: 'local_email_index',
          sortKey: 'email',
        },
      ],
      'name'
    );

    const index = dynamoIndexes.getIndex({
      keyCondition: {
        partition: {
          name: 'foo',
          email: 'aaa@aaa.cl',
        },
        sort: {
          age: 10,
        },
      },
    });

    expect(index).toBeDefined();
    expect(index?.name).toBe('global_multi_attribute_index');
  });

  it('should throw error when not found a global index', () => {
    const dynamoIndexes = new DynamoIndexes(
      [
        {
          type: 'global',
          name: 'global_multi_attribute_index',
          partitionKey: ['name', 'email'],
          sortKey: ['age', 'other'],
        },
      ],
      'name'
    );

    expect(() => {
      dynamoIndexes.getIndex({
        keyCondition: {
          partition: {
            name: 'foo',
            email: 'aaa@aaa.cl',
          },
          sort: {
            foo: 10,
            bar: 'aa',
          },
        },
      });
    }).toThrow();
  });

  it('should return index by name', () => {
    const dynamoIndexes = new DynamoIndexes(
      [
        {
          type: 'global',
          name: 'global_multi_attribute_index',
          partitionKey: ['name', 'email'],
          sortKey: ['age', 'other'],
        },
      ],
      'name'
    );

    const index = dynamoIndexes.getIndex({
      indexName: 'global_multi_attribute_index',
      keyCondition: {
        partition: {
          name: 'foo',
          email: 'aaa@aaa.cl',
        },
        sort: {
          foo: 10,
          bar: 'aa',
        },
      },
    });

    expect(index).toBeDefined();
    expect(index?.name).toBe('global_multi_attribute_index');
  });
});
