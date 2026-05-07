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

      console.log(JSON.stringify(builder.getCommand(), null, 2));
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
});
