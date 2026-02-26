import {
  createFieldName,
  enableBuildEnvVariable,
  FieldProperties,
  getMetadataPrototypeByKey,
} from '@lafken/common';
import { describe, expect, it } from 'vitest';
import {
  BodyParam,
  ContextParam,
  HeaderParam,
  PARAM_PREFIX,
  PathParam,
  QueryParam,
} from './param';

const key = createFieldName(PARAM_PREFIX, FieldProperties.field);

describe('Params', () => {
  enableBuildEnvVariable();
  describe('BodyParam', () => {
    it('should create a body param', () => {
      class Request {
        @BodyParam()
        name: string;
      }

      const params = getMetadataPrototypeByKey(Request, key);
      expect(params).toStrictEqual([
        {
          required: true,
          source: 'body',
          type: 'String',
          initialValue: undefined,
          destinationName: 'name',
          name: 'name',
        },
      ]);
    });

    it('should create a body param with full config', () => {
      class Request {
        @BodyParam({
          deprecated: false,
          description: 'a example body param',
          enum: ['a', 'b', 'c'],
          example: 'a',
          format: 'simple',
          maxLength: 100,
          minLength: 1,
          name: 'other-name',
          nullable: false,
          required: true,
          type: String,
        })
        name: string;
      }

      const params = getMetadataPrototypeByKey(Request, key);
      expect(params).toStrictEqual([
        {
          deprecated: false,
          description: 'a example body param',
          destinationName: 'name',
          enum: ['a', 'b', 'c'],
          example: 'a',
          format: 'simple',
          initialValue: undefined,
          maxLength: 100,
          minLength: 1,
          name: 'other-name',
          nullable: false,
          required: true,
          source: 'body',
          type: 'String',
        },
      ]);
    });
  });

  describe('PathParam', () => {
    it('should create a path param', () => {
      class Request {
        @PathParam()
        name: string;
      }

      const params = getMetadataPrototypeByKey(Request, key);
      expect(params).toStrictEqual([
        {
          required: true,
          source: 'path',
          type: 'String',
          initialValue: undefined,
          destinationName: 'name',
          name: 'name',
        },
      ]);
    });
  });

  describe('QueryParam', () => {
    it('should create a body param', () => {
      class Request {
        @QueryParam()
        name: string;
      }

      const params = getMetadataPrototypeByKey(Request, key);
      expect(params).toStrictEqual([
        {
          required: true,
          source: 'query',
          type: 'String',
          initialValue: undefined,
          destinationName: 'name',
          name: 'name',
        },
      ]);
    });
  });

  describe('HeaderParam', () => {
    it('should create a body param', () => {
      class Request {
        @HeaderParam()
        name: string;
      }

      const params = getMetadataPrototypeByKey(Request, key);
      expect(params).toStrictEqual([
        {
          required: true,
          source: 'header',
          type: 'String',
          initialValue: undefined,
          destinationName: 'name',
          name: 'name',
        },
      ]);
    });
  });

  describe('ContextParam', () => {
    it('should create a body param', () => {
      class Request {
        @ContextParam()
        name: string;
      }

      const params = getMetadataPrototypeByKey(Request, key);
      expect(params).toStrictEqual([
        {
          required: true,
          source: 'context',
          type: 'String',
          initialValue: undefined,
          destinationName: 'name',
          name: 'name',
        },
      ]);
    });
  });
});
