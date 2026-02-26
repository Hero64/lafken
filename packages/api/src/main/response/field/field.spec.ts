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
  });
});
