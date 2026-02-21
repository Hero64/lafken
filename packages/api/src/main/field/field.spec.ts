import 'reflect-metadata';
import { enableBuildEnvVariable, getMetadataPrototypeByKey } from '@lafken/common';
import { describe, expect, it } from 'vitest';
import { Payload } from '../event';
import { apiFieldKey, Field, Param } from './field';
import type { ApiArrayParam, ApiParamMetadata } from './field.types';

describe('Field', () => {
  enableBuildEnvVariable();

  describe('Param decorator', () => {
    @Payload()
    class ObjectField {
      @Field()
      foo: number;
    }

    class Test {
      @Param({})
      foo: string;

      @Param({
        name: 'bar_changed',
      })
      bar: string;

      @Param({
        source: 'body',
        type: [ObjectField],
      })
      data: ObjectField[];
    }
    const fields = getMetadataPrototypeByKey<ApiParamMetadata[]>(Test, apiFieldKey);

    it('should exist param metadata', () => {
      expect(fields).toBeDefined();
    });

    it('should have default metadata', () => {
      const foo = fields[0];

      expect(foo.validation.required).toBeTruthy();
      expect(foo.source).toBe('query');
    });

    it('should accept other payload as data', () => {
      const data = fields[2] as ApiArrayParam;

      expect(data.type).toBe('Array');
      expect(data.items).toMatchObject({
        destinationName: 'Object',
        name: 'Object',
        payload: { id: 'ObjectField', name: 'ObjectField' },
        properties: [
          {
            destinationName: 'foo',
            name: 'foo',
            type: 'Number',
            validation: { required: true },
          },
        ],
        type: 'Object',
      });
      expect(data.items.type).toBe('Object');
    });
  });

  describe('Field decorator', () => {
    it('should exist param metadata', () => {
      class Test {
        @Field({})
        foo: string;
      }
      const field = getMetadataPrototypeByKey<ApiParamMetadata[]>(Test, apiFieldKey);

      expect(field).toHaveLength(1);
    });

    it('should include data in extend class', () => {
      class Base {
        @Field()
        bar: number;
      }

      class Test extends Base {
        @Field({})
        foo: string;
      }

      const field = getMetadataPrototypeByKey<ApiParamMetadata[]>(Test, apiFieldKey);

      expect(field).toHaveLength(2);
    });
  });
});
