import {
  createFieldName,
  enableBuildEnvVariable,
  FieldProperties,
  getMetadataPrototypeByKey,
} from '@lafken/common';
import { describe, expect, it } from 'vitest';
import { RESPONSE_PREFIX, ResField } from './field';

const key = createFieldName(RESPONSE_PREFIX, FieldProperties.field);

describe('Field', () => {
  enableBuildEnvVariable();
  describe('ResField', () => {
    it('should create a response field', () => {
      class Response {
        @ResField()
        name: string;
      }

      const params = getMetadataPrototypeByKey(Response, key);
      expect(params).toStrictEqual([
        {
          required: true,
          type: 'String',
          initialValue: undefined,
          destinationName: 'name',
          name: 'name',
        },
      ]);
    });

    it('should create responses a field with full params', () => {
      class Response {
        @ResField({
          deprecated: false,
          description: 'a example field response',
          enum: ['a', 'b', 'c'],
          example: 'a',
          format: 'simple',
          maxLength: 100,
          minLength: 1,
          name: 'other-name',
          nullable: false,
          required: true,
          type: 'String',
        })
        name: string;
      }

      const params = getMetadataPrototypeByKey(Response, key);
      expect(params).toStrictEqual([
        {
          deprecated: false,
          description: 'a example field response',
          required: true,
          type: 'String',
          destinationName: 'name',
          enum: ['a', 'b', 'c'],
          example: 'a',
          format: 'simple',
          initialValue: 'String',
          maxLength: 100,
          minLength: 1,
          name: 'other-name',
          nullable: false,
        },
      ]);
    });

    it('should store a custom VTL template on the field metadata', () => {
      class Response {
        @ResField({ template: "$input.path('$.nested.id')" })
        id: string;
      }

      const params = getMetadataPrototypeByKey(Response, key);
      expect(params).toStrictEqual([
        {
          required: true,
          type: 'String',
          initialValue: undefined,
          destinationName: 'id',
          name: 'id',
          template: "$input.path('$.nested.id')",
        },
      ]);
    });

    it('should store template alongside other field props', () => {
      class Response {
        @ResField({ description: 'source field', template: "$input.path('$.src.value')" })
        value: number;
      }

      const params = getMetadataPrototypeByKey(Response, key) as any[];
      expect(params[0]).toMatchObject({
        name: 'value',
        type: 'Number',
        template: "$input.path('$.src.value')",
        description: 'source field',
        required: true,
      });
    });

    it('should not include template when not provided', () => {
      class Response {
        @ResField()
        title: string;
      }

      const params = getMetadataPrototypeByKey(Response, key) as any[];
      expect(params[0].template).toBeUndefined();
    });
  });
});
