import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { describe, expect, it } from 'vitest';

import type { QueryBuilderProps } from '../base/base.types';
import { UpdateBuilder } from './update';

const getBaseProps = (): Omit<QueryBuilderProps<any>, 'inputProps'> => ({
  client: new DynamoDBClient(),
  fields: {},
  modelProps: {
    name: 'test-table',
    readCapacity: 0,
    writeCapacity: 0,
    indexes: [],
  },
  partitionKey: 'id',
});

describe('UpdateBuilder', () => {
  describe('attribute value key collision', () => {
    it('should not overwrite attribute values when setValues and condition share the same field', () => {
      const builder = new UpdateBuilder({
        ...getBaseProps(),
        inputProps: {
          keyCondition: { id: '123' },
          setValues: { status: 'disabled' },
          condition: { status: 'enabled' },
        },
      });

      const command = builder.getCommand();

      const values = command.ExpressionAttributeValues!;
      const rawValues = Object.fromEntries(
        Object.entries(values).map(([k, v]) => [k, (v as any).S ?? (v as any).N])
      );

      const entries = Object.entries(rawValues);
      const statusEntries = entries.filter(([k]) => k.startsWith(':status'));

      expect(statusEntries).toHaveLength(2);
      expect(statusEntries.map(([, v]) => v)).toEqual(
        expect.arrayContaining(['disabled', 'enabled'])
      );
    });

    it('should not overwrite attribute values when setValues and replaceValues share the same field', () => {
      const builder = new UpdateBuilder({
        ...getBaseProps(),
        inputProps: {
          keyCondition: { partition: { id: '123' } },
          setValues: { count: { incrementValue: 1 } },
          replaceValues: { count: 10 },
        },
      });

      const command = builder.getCommand();
      const values = command.ExpressionAttributeValues!;
      const rawValues = Object.fromEntries(
        Object.entries(values).map(([k, v]) => [k, (v as any).S ?? (v as any).N])
      );

      const countEntries = Object.entries(rawValues).filter(([k]) =>
        k.startsWith(':count')
      );

      expect(countEntries).toHaveLength(2);
      expect(countEntries.map(([, v]) => v)).toEqual(expect.arrayContaining(['1', '10']));
    });

    it('should produce unique attribute value keys across setValues, replaceValues and condition', () => {
      const builder = new UpdateBuilder({
        ...getBaseProps(),
        inputProps: {
          keyCondition: { partition: { id: '123' } },
          setValues: { status: 'disabled' },
          replaceValues: { name: 'new-name' },
          condition: { status: 'enabled' },
        },
      });

      const command = builder.getCommand();
      const keys = Object.keys(command.ExpressionAttributeValues!);
      const uniqueKeys = new Set(keys);

      expect(keys.length).toBe(uniqueKeys.size);

      const statusKeys = keys.filter((k) => k.startsWith(':status'));
      expect(statusKeys).toHaveLength(2);
    });
  });

  describe('UpdateExpression', () => {
    it('should build a valid SET expression from setValues', () => {
      const builder = new UpdateBuilder({
        ...getBaseProps(),
        inputProps: {
          keyCondition: { partition: { id: '123' } },
          setValues: { status: 'active' },
        },
      });

      expect(builder.getCommand().UpdateExpression).toMatch(/^SET /);
    });

    it('should build a SET increment expression from a bigint setValue', () => {
      const builder = new UpdateBuilder({
        ...getBaseProps(),
        inputProps: {
          keyCondition: { partition: { id: '123' } },
          setValues: { balance: { incrementValue: 5n } },
        },
      });

      expect(builder.getCommand().UpdateExpression).toBe(
        'SET #balance = #balance +  :balance_1_0'
      );
      expect(builder.getCommand().ExpressionAttributeValues).toEqual({
        ':balance_1_0': { N: '5' },
      });
    });

    it('should build a SET decrement expression from a bigint setValue', () => {
      const builder = new UpdateBuilder({
        ...getBaseProps(),
        inputProps: {
          keyCondition: { partition: { id: '123' } },
          setValues: { balance: { decrementValue: 5n } },
        },
      });

      expect(builder.getCommand().UpdateExpression).toBe(
        'SET #balance = #balance -  :balance_1_0'
      );
      expect(builder.getCommand().ExpressionAttributeValues).toEqual({
        ':balance_1_0': { N: '5' },
      });
    });

    it('should preserve full precision when incrementing with a large bigint', () => {
      const builder = new UpdateBuilder({
        ...getBaseProps(),
        inputProps: {
          keyCondition: { partition: { id: '123' } },
          setValues: { balance: { incrementValue: BigInt('87367642788436732676767') } },
        },
      });

      expect(builder.getCommand().UpdateExpression).toBe(
        'SET #balance = #balance +  :balance_1_0'
      );
      expect(builder.getCommand().ExpressionAttributeValues).toEqual({
        ':balance_1_0': { N: '87367642788436732676767' },
      });
    });

    it('should build a combined SET expression from setValues and replaceValues', () => {
      const builder = new UpdateBuilder({
        ...getBaseProps(),
        inputProps: {
          keyCondition: { partition: { id: '123' } },
          setValues: { status: 'active' },
          replaceValues: { name: 'foo' },
        },
      });

      expect(builder.getCommand().UpdateExpression).toMatch(/^SET /);
    });

    it('should build a REMOVE expression from removeValues', () => {
      const builder = new UpdateBuilder({
        ...getBaseProps(),
        inputProps: {
          keyCondition: { partition: { id: '123' } },
          removeValues: { status: true },
        },
      });

      expect(builder.getCommand().UpdateExpression).toMatch(/REMOVE /);
    });
  });

  describe('undefined value handling', () => {
    it('should filter out undefined values from setValues', () => {
      const builder = new UpdateBuilder({
        ...getBaseProps(),
        inputProps: {
          keyCondition: { id: '123' },
          setValues: {
            name: 'John',
            age: undefined,
            email: 'john@example.com',
          },
        },
      });

      const command = builder.getCommand();
      const values = command.ExpressionAttributeValues!;
      const rawValues = Object.fromEntries(
        Object.entries(values).map(([k, v]) => [k, (v as any).S ?? (v as any).N])
      );

      // Should only have values for name and email, not age
      expect(Object.keys(rawValues)).toHaveLength(2);
      expect(Object.keys(rawValues).some((k) => k.includes('age'))).toBe(false);
    });

    it('should filter out undefined values from replaceValues', () => {
      const builder = new UpdateBuilder({
        ...getBaseProps(),
        inputProps: {
          keyCondition: { id: '123' },
          replaceValues: {
            name: 'John',
            age: undefined,
            email: 'john@example.com',
          },
        },
      });

      const command = builder.getCommand();
      const values = command.ExpressionAttributeValues!;
      const rawValues = Object.fromEntries(
        Object.entries(values).map(([k, v]) => [k, (v as any).S ?? (v as any).N])
      );

      // Should only have values for name and email, not age
      expect(Object.keys(rawValues)).toHaveLength(2);
      expect(Object.keys(rawValues).some((k) => k.includes('age'))).toBe(false);
    });

    it('should filter out undefined values from nested setValues', () => {
      const builder = new UpdateBuilder({
        ...getBaseProps(),
        inputProps: {
          keyCondition: { id: '123' },
          setValues: {
            address: {
              city: 'New York',
              zip: undefined,
              state: 'NY',
            },
          },
        },
      });

      const command = builder.getCommand();
      const values = command.ExpressionAttributeValues!;
      const rawValues = Object.fromEntries(
        Object.entries(values).map(([k, v]) => [k, (v as any).S ?? (v as any).N])
      );

      // Should only have values for city and state, not zip
      expect(Object.keys(rawValues)).toHaveLength(2);
      expect(Object.keys(rawValues).some((k) => k.includes('zip'))).toBe(false);
    });

    it('should still work when all setValues are undefined (empty after filtering)', () => {
      const builder = new UpdateBuilder({
        ...getBaseProps(),
        inputProps: {
          keyCondition: { id: '123' },
          setValues: {
            name: undefined,
            age: undefined,
          },
        },
      });

      const command = builder.getCommand();
      const values = command.ExpressionAttributeValues!;

      // Should have no SET expression
      expect(command.UpdateExpression).not.toMatch(/^SET/);
      expect(values).toBeUndefined();
    });
  });
});
