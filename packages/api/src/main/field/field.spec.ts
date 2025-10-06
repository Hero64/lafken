import 'reflect-metadata';
import { enableBuildEnvVariable, getMetadataPrototypeByKey } from '@alicanto/common';
import { ApiReflectKeys } from '../api';
import { Payload } from '../event';
import { Field, Param } from './field';
import type { ParamMetadata } from './field.types';

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
    const fields = getMetadataPrototypeByKey<ParamMetadata[]>(Test, ApiReflectKeys.FIELD);

    it('should exist param metadata', () => {
      expect(fields).toHaveLength(3);
    });

    it('should have default metadata', () => {
      const foo = fields[0];

      expect(foo.required).toBeTruthy();
      expect(foo.source).toBe('query');
    });

    it('should accept other payload as data', () => {
      const data = fields[2];

      expect(data.fieldType).toBe('Array');
      expect(data.subFieldType).toBe('Object');
      expect(data.params).toBeDefined();
    });
  });

  describe('Field decorator', () => {
    it('should exist param metadata', () => {
      class Test {
        @Field({})
        foo: string;
      }
      const fields = getMetadataPrototypeByKey<ParamMetadata[]>(
        Test,
        ApiReflectKeys.FIELD
      );
      expect(fields).toHaveLength(1);
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

      const fields = getMetadataPrototypeByKey<ParamMetadata[]>(
        Test,
        ApiReflectKeys.FIELD
      );

      expect(fields).toHaveLength(2);
    });
  });
});
