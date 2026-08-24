import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { describe, expect, it } from 'vitest';
import { QueryBuilderBase } from './base';
import type { QueryBuilderProps } from './base.types';

const getQueryBuilderProps = (): QueryBuilderProps<any> => {
  return {
    client: new DynamoDBClient(),
    fields: {},
    modelProps: {
      name: 'test',
      readCapacity: 0,
      writeCapacity: 0,
      indexes: [],
    },
    partitionKey: 'email',
    sortKey: 'name',
  };
};

describe('Query builder base', () => {
  describe('Condition Expression', () => {
    it('should return a valid condition expression', () => {
      class QueryBuilder extends QueryBuilderBase<any> {
        public getConditionExpression() {
          return this.getKeyConditionExpression({
            partition: {
              name: 'test',
            },
            sort: {
              age: 12,
            },
          });
        }
      }

      const qb = new QueryBuilder(getQueryBuilderProps());

      expect(qb.getConditionExpression()).toEqual('#name = :name and #age = :age');
    });

    it('should return a valid condition expression using a multi attribute index', () => {
      class QueryBuilder extends QueryBuilderBase<any> {
        public getConditionExpression() {
          return this.getKeyConditionExpression(
            {
              partition: {
                name: 'test',
                email: 'test@test.com',
              },
              sort: {
                age: 12,
                foo: 'bar',
                baz: {
                  beginsWith: 'test',
                },
              },
            },
            {
              name: 'multi_attribute_index',
              type: 'global',
              partitionKey: new Set(['name', 'email']),
              sortKey: new Set(['age', 'foo', 'baz']),
            }
          );
        }
      }

      const qb = new QueryBuilder(getQueryBuilderProps());

      expect(qb.getConditionExpression()).toEqual(
        '#name = :name and #email = :email and #age = :age and #foo = :foo and begins_with(#baz, :baz)'
      );
    });

    it('should omit undefined partition attributes and build expression with defined keys only', () => {
      class QueryBuilder extends QueryBuilderBase<any> {
        public getConditionExpression() {
          return this.getKeyConditionExpression(
            {
              partition: {
                name: 'test',
                email: undefined,
              },
              sort: {
                age: 12,
              },
            },
            {
              name: 'partial_partition_index',
              type: 'global',
              partitionKey: new Set(['name']),
              sortKey: new Set(['age']),
            }
          );
        }
      }

      const qb = new QueryBuilder(getQueryBuilderProps());

      expect(qb.getConditionExpression()).toEqual('#name = :name and #age = :age');
    });

    it('should omit undefined sort attributes and build expression with defined keys only', () => {
      class QueryBuilder extends QueryBuilderBase<any> {
        public getConditionExpression() {
          return this.getKeyConditionExpression(
            {
              partition: {
                name: 'test',
                email: 'test@test.com',
              },
              sort: {
                age: 12,
                foo: undefined,
              },
            },
            {
              name: 'partial_sort_index',
              type: 'global',
              partitionKey: new Set(['name', 'email']),
              sortKey: new Set(['age']),
            }
          );
        }
      }

      const qb = new QueryBuilder(getQueryBuilderProps());

      expect(qb.getConditionExpression()).toEqual(
        '#name = :name and #email = :email and #age = :age'
      );
    });

    it('should omit undefined attributes in both partition and sort keys', () => {
      class QueryBuilder extends QueryBuilderBase<any> {
        public getConditionExpression() {
          return this.getKeyConditionExpression(
            {
              partition: {
                name: 'test',
                email: undefined,
              },
              sort: {
                age: 12,
                foo: undefined,
              },
            },
            {
              name: 'partial_multi_index',
              type: 'global',
              partitionKey: new Set(['name']),
              sortKey: new Set(['age']),
            }
          );
        }
      }

      const qb = new QueryBuilder(getQueryBuilderProps());

      expect(qb.getConditionExpression()).toEqual('#name = :name and #age = :age');
    });

    it('should throw error to invalid multi attribute selection', () => {
      class QueryBuilder extends QueryBuilderBase<any> {
        public getConditionExpression() {
          return this.getKeyConditionExpression(
            {
              partition: {
                name: 'test',
                email: 'test@test.com',
              },
              sort: {
                age: 12,
                baz: '',
                foo: {
                  beginsWith: 'test',
                },
              },
            },
            {
              name: 'multi_attribute_index',
              type: 'global',
              partitionKey: new Set(['name', 'email']),
              sortKey: new Set(['age', 'foo', 'baz']),
            }
          );
        }
      }

      const qb = new QueryBuilder(getQueryBuilderProps());

      expect(qb.getConditionExpression).toThrow();
    });
  });

  describe('Filter Expression', () => {
    it('should return a valid filter expression', () => {
      class QueryBuilder extends QueryBuilderBase<any> {
        public getQueryFilter() {
          return this.getFilterExpression({
            name: 'foo',
            age: 10,
          });
        }
      }

      const qb = new QueryBuilder(getQueryBuilderProps());
      expect(qb.getQueryFilter()).toEqual('#name = :name_1_0 and #age = :age_1_1');
    });

    it('should return a valid filter expression in complex filter', () => {
      class QueryBuilder extends QueryBuilderBase<any> {
        public getQueryFilter() {
          return this.getFilterExpression({
            age: {
              between: [1, 100],
            },
            email: {
              contains: '@gmail.com',
            },
            OR: [
              {
                name: {
                  in: ['foo', 'bar', 'other'],
                },
              },
              {
                other: {
                  notExist: true,
                },
              },
            ],
          });
        }
      }

      const qb = new QueryBuilder(getQueryBuilderProps());

      expect(qb.getQueryFilter()).toEqual(
        '#age BETWEEN :age_1_0_0 and :age_1_0_1 and contains(#email, :email_1_1) and (#name in (:name_2_0_0,:name_2_0_1,:name_2_0_2) or attribute_not_exists(#other))'
      );
    });

    it('should omit attributes whose value is undefined', () => {
      class QueryBuilder extends QueryBuilderBase<any> {
        public getQueryFilter() {
          return this.getFilterExpression({
            name: undefined,
            age: { notEqual: undefined },
            email: {
              contains: '@gmail.com',
            },
          });
        }
      }

      const qb = new QueryBuilder(getQueryBuilderProps());
      expect(qb.getQueryFilter()).toEqual('contains(#email, :email_1_1)');
    });

    it('should omit a nested filter group when all of its attributes are undefined', () => {
      class QueryBuilder extends QueryBuilderBase<any> {
        public getQueryFilter() {
          return this.getFilterExpression({
            address: {
              city: undefined,
            },
            email: {
              contains: '@gmail.com',
            },
          });
        }
      }

      const qb = new QueryBuilder(getQueryBuilderProps());
      expect(qb.getQueryFilter()).toEqual('contains(#email, :email_1_1)');
      expect(qb.getQueryFilter()).not.toContain('#address');
    });

    it('should return an empty expression when all attributes are undefined', () => {
      class QueryBuilder extends QueryBuilderBase<any> {
        public getQueryFilter() {
          return this.getFilterExpression({
            name: undefined,
            age: { notEqual: undefined },
          });
        }
      }

      const qb = new QueryBuilder(getQueryBuilderProps());
      expect(qb.getQueryFilter()).toEqual('');
    });
  });

  describe('Attribute and Names', () => {
    it('should get attributes', () => {
      class QueryBuilder extends QueryBuilderBase<any> {
        public getAttributes() {
          this.getKeyConditionExpression({
            partition: {
              name: 'test',
            },
            sort: {
              age: 12,
            },
          });

          return this.getAttributesAndNames();
        }
      }

      const qb = new QueryBuilder(getQueryBuilderProps());

      expect(qb.getAttributes()).toStrictEqual({
        ExpressionAttributeNames: { '#name': 'name', '#age': 'age' },
        ExpressionAttributeValues: { ':name': { S: 'test' }, ':age': { N: '12' } },
      });
    });
  });
});
