import { describe, expect, it } from 'vitest';
import type {
  ApiArrayMetadata,
  ApiBooleanMetadata,
  ApiNumberMetadata,
  ApiObjectMetadata,
  ApiStringMetadata,
} from '..';
import { objectToSchema, paramToSchema } from './schema';

const basePayload = {
  id: 'test-payload',
  name: 'TestPayload',
};

const baseMetadata = { source: 'body' as const };

describe('paramToSchema', () => {
  describe('String', () => {
    it('should convert a basic string param', () => {
      const param: ApiStringMetadata = {
        type: 'String',
        name: 'username',
        destinationName: 'username',
        ...baseMetadata,
      };

      expect(paramToSchema(param)).toEqual({
        type: 'string',
        nullable: undefined,
        enum: undefined,
        minLength: undefined,
        maxLength: undefined,
        pattern: undefined,
        format: undefined,
      });
    });

    it('should map all string constraints', () => {
      const param: ApiStringMetadata = {
        type: 'String',
        name: 'email',
        destinationName: 'email',
        nullable: true,
        enum: ['a@b.com', 'c@d.com'],
        minLength: 5,
        maxLength: 100,
        pattern: '^[^@]+@[^@]+$',
        format: 'email',
        ...baseMetadata,
      };

      expect(paramToSchema(param)).toEqual({
        type: 'string',
        nullable: true,
        enum: ['a@b.com', 'c@d.com'],
        minLength: 5,
        maxLength: 100,
        pattern: '^[^@]+@[^@]+$',
        format: 'email',
      });
    });
  });

  describe('Number', () => {
    it('should convert a basic number param', () => {
      const param: ApiNumberMetadata = {
        type: 'Number',
        name: 'age',
        destinationName: 'age',
        ...baseMetadata,
      };

      expect(paramToSchema(param)).toEqual({
        type: 'number',
        nullable: undefined,
        minimum: undefined,
        maximum: undefined,
        exclusiveMinimum: undefined,
        exclusiveMaximum: undefined,
        multipleOf: undefined,
      });
    });

    it('should map all number constraints', () => {
      const param: ApiNumberMetadata = {
        type: 'Number',
        name: 'score',
        destinationName: 'score',
        nullable: true,
        min: 0,
        max: 100,
        exclusiveMin: true,
        exclusiveMax: false,
        multipleOf: 0.5,
        ...baseMetadata,
      };

      expect(paramToSchema(param)).toEqual({
        type: 'number',
        nullable: true,
        minimum: 0,
        maximum: 100,
        exclusiveMinimum: true,
        exclusiveMaximum: false,
        multipleOf: 0.5,
      });
    });
  });

  describe('Boolean', () => {
    it('should convert a boolean param', () => {
      const param: ApiBooleanMetadata = {
        type: 'Boolean',
        name: 'active',
        destinationName: 'active',
        ...baseMetadata,
      };

      expect(paramToSchema(param)).toEqual({
        type: 'boolean',
        nullable: undefined,
      });
    });

    it('should map nullable boolean', () => {
      const param: ApiBooleanMetadata = {
        type: 'Boolean',
        name: 'active',
        destinationName: 'active',
        nullable: true,
        ...baseMetadata,
      };

      expect(paramToSchema(param)).toEqual({
        type: 'boolean',
        nullable: true,
      });
    });
  });

  describe('Array', () => {
    it('should convert an array param with string items', () => {
      const param: ApiArrayMetadata = {
        type: 'Array',
        name: 'tags',
        destinationName: 'tags',
        items: {
          type: 'String',
          name: 'tag',
          destinationName: 'tag',
          ...baseMetadata,
        },
        ...baseMetadata,
      };

      expect(paramToSchema(param)).toEqual({
        type: 'array',
        nullable: undefined,
        minItems: undefined,
        maxItems: undefined,
        uniqueItems: undefined,
        items: {
          type: 'string',
          nullable: undefined,
          enum: undefined,
          minLength: undefined,
          maxLength: undefined,
          pattern: undefined,
          format: undefined,
        },
      });
    });

    it('should map all array constraints', () => {
      const param: ApiArrayMetadata = {
        type: 'Array',
        name: 'ids',
        destinationName: 'ids',
        nullable: true,
        minItems: 1,
        maxItems: 10,
        uniqueItems: true,
        items: {
          type: 'Number',
          name: 'id',
          destinationName: 'id',
          min: 1,
          ...baseMetadata,
        },
        ...baseMetadata,
      };

      expect(paramToSchema(param)).toEqual({
        type: 'array',
        nullable: true,
        minItems: 1,
        maxItems: 10,
        uniqueItems: true,
        items: {
          type: 'number',
          nullable: undefined,
          minimum: 1,
          maximum: undefined,
          exclusiveMinimum: undefined,
          exclusiveMaximum: undefined,
          multipleOf: undefined,
        },
      });
    });
  });

  describe('Object', () => {
    it('should delegate to objectToSchema', () => {
      const param: ApiObjectMetadata = {
        type: 'Object',
        name: 'address',
        destinationName: 'address',
        payload: { ...basePayload },
        properties: [
          {
            type: 'String',
            name: 'street',
            destinationName: 'street',
            required: true,
            ...baseMetadata,
          },
        ],
        ...baseMetadata,
      };

      const result = paramToSchema(param);

      expect(result).toEqual({
        type: 'object',
        nullable: undefined,
        additionalProperties: undefined,
        required: ['street'],
        properties: {
          street: {
            type: 'string',
            nullable: undefined,
            enum: undefined,
            minLength: undefined,
            maxLength: undefined,
            pattern: undefined,
            format: undefined,
          },
        },
      });
    });
  });
});

describe('objectToSchema', () => {
  it('should convert an empty object', () => {
    const data: ApiObjectMetadata = {
      type: 'Object',
      name: 'empty',
      destinationName: 'empty',
      payload: { ...basePayload },
      properties: [],
      ...baseMetadata,
    };

    expect(objectToSchema(data)).toEqual({
      type: 'object',
      properties: {},
      required: undefined,
      nullable: undefined,
      additionalProperties: undefined,
    });
  });

  it('should collect required fields', () => {
    const data: ApiObjectMetadata = {
      type: 'Object',
      name: 'user',
      destinationName: 'user',
      payload: { ...basePayload },
      properties: [
        {
          type: 'String',
          name: 'name',
          destinationName: 'name',
          required: true,
          ...baseMetadata,
        },
        {
          type: 'String',
          name: 'bio',
          destinationName: 'bio',
          ...baseMetadata,
        },
        {
          type: 'Number',
          name: 'age',
          destinationName: 'age',
          required: true,
          ...baseMetadata,
        },
      ],
      ...baseMetadata,
    };

    const result = objectToSchema(data);

    expect(result.required).toEqual(['name', 'age']);
  });

  it('should omit required when no fields are required', () => {
    const data: ApiObjectMetadata = {
      type: 'Object',
      name: 'optional',
      destinationName: 'optional',
      payload: { ...basePayload },
      properties: [
        {
          type: 'String',
          name: 'foo',
          destinationName: 'foo',
          ...baseMetadata,
        },
      ],
      ...baseMetadata,
    };

    expect(objectToSchema(data).required).toBeUndefined();
  });

  it('should map nullable', () => {
    const data: ApiObjectMetadata = {
      type: 'Object',
      name: 'nullable',
      destinationName: 'nullable',
      nullable: true,
      payload: { ...basePayload },
      properties: [],
      ...baseMetadata,
    };

    expect(objectToSchema(data).nullable).toBe(true);
  });

  it('should map additionalProperties', () => {
    const data: ApiObjectMetadata = {
      type: 'Object',
      name: 'strict',
      destinationName: 'strict',
      payload: { ...basePayload, additionalProperties: false },
      properties: [],
      ...baseMetadata,
    };

    expect(objectToSchema(data).additionalProperties).toBe(false);
  });

  describe('nested objects', () => {
    it('should handle nested object properties', () => {
      const data: ApiObjectMetadata = {
        type: 'Object',
        name: 'user',
        destinationName: 'user',
        payload: { ...basePayload },
        properties: [
          {
            type: 'Object',
            name: 'address',
            destinationName: 'address',
            required: true,
            payload: { id: 'address-payload', name: 'Address' },
            properties: [
              {
                type: 'String',
                name: 'city',
                destinationName: 'city',
                required: true,
                ...baseMetadata,
              },
              {
                type: 'Number',
                name: 'zip',
                destinationName: 'zip',
                ...baseMetadata,
              },
            ],
            ...baseMetadata,
          },
        ],
        ...baseMetadata,
      };

      const result = objectToSchema(data);

      expect(result.required).toEqual(['address']);
      expect(result.properties?.address).toEqual({
        type: 'object',
        nullable: undefined,
        additionalProperties: undefined,
        required: ['city'],
        properties: {
          city: {
            type: 'string',
            nullable: undefined,
            enum: undefined,
            minLength: undefined,
            maxLength: undefined,
            pattern: undefined,
            format: undefined,
          },
          zip: {
            type: 'number',
            nullable: undefined,
            minimum: undefined,
            maximum: undefined,
            exclusiveMinimum: undefined,
            exclusiveMaximum: undefined,
            multipleOf: undefined,
          },
        },
      });
    });

    it('should handle array of objects', () => {
      const data: ApiObjectMetadata = {
        type: 'Object',
        name: 'order',
        destinationName: 'order',
        payload: { ...basePayload },
        properties: [
          {
            type: 'Array',
            name: 'items',
            destinationName: 'items',
            minItems: 1,
            items: {
              type: 'Object',
              name: 'item',
              destinationName: 'item',
              payload: { id: 'item-payload', name: 'Item' },
              properties: [
                {
                  type: 'String',
                  name: 'sku',
                  destinationName: 'sku',
                  required: true,
                  ...baseMetadata,
                },
                {
                  type: 'Number',
                  name: 'qty',
                  destinationName: 'qty',
                  required: true,
                  min: 1,
                  ...baseMetadata,
                },
              ],
              ...baseMetadata,
            },
            ...baseMetadata,
          },
        ],
        ...baseMetadata,
      };

      const result = objectToSchema(data);
      const itemsSchema = result.properties?.items;

      expect(itemsSchema?.type).toBe('array');
      expect(itemsSchema?.minItems).toBe(1);
      expect(itemsSchema?.items).toEqual({
        type: 'object',
        nullable: undefined,
        additionalProperties: undefined,
        required: ['sku', 'qty'],
        properties: {
          sku: {
            type: 'string',
            nullable: undefined,
            enum: undefined,
            minLength: undefined,
            maxLength: undefined,
            pattern: undefined,
            format: undefined,
          },
          qty: {
            type: 'number',
            nullable: undefined,
            minimum: 1,
            maximum: undefined,
            exclusiveMinimum: undefined,
            exclusiveMaximum: undefined,
            multipleOf: undefined,
          },
        },
      });
    });
  });

  describe('composition keywords', () => {
    it('should map allOf from payload', () => {
      const data: ApiObjectMetadata = {
        type: 'Object',
        name: 'combo',
        destinationName: 'combo',
        payload: {
          ...basePayload,
          allOf: [
            { required: ['name'] },
            { properties: { age: { type: 'number', minimum: 0 } } },
          ],
        },
        properties: [
          {
            type: 'String',
            name: 'name',
            destinationName: 'name',
            ...baseMetadata,
          },
          {
            type: 'Number',
            name: 'age',
            destinationName: 'age',
            ...baseMetadata,
          },
        ],
        ...baseMetadata,
      };

      const result = objectToSchema(data);

      expect(result.allOf).toEqual([
        { required: ['name'] },
        { properties: { age: { type: 'number', minimum: 0 } } },
      ]);
    });

    it('should map anyOf from payload', () => {
      const data: ApiObjectMetadata = {
        type: 'Object',
        name: 'flexible',
        destinationName: 'flexible',
        payload: {
          ...basePayload,
          anyOf: [{ required: ['email'] }, { required: ['phone'] }],
        },
        properties: [
          {
            type: 'String',
            name: 'email',
            destinationName: 'email',
            ...baseMetadata,
          },
          {
            type: 'String',
            name: 'phone',
            destinationName: 'phone',
            ...baseMetadata,
          },
        ],
        ...baseMetadata,
      };

      const result = objectToSchema(data);

      expect(result.anyOf).toEqual([{ required: ['email'] }, { required: ['phone'] }]);
    });

    it('should map oneOf from payload', () => {
      const data: ApiObjectMetadata = {
        type: 'Object',
        name: 'exclusive',
        destinationName: 'exclusive',
        payload: {
          ...basePayload,
          oneOf: [
            {
              properties: { role: { type: 'string', enum: ['admin'] } },
              required: ['role'],
            },
            {
              properties: { role: { type: 'string', enum: ['user'] } },
              required: ['role'],
            },
          ],
        },
        properties: [
          {
            type: 'String',
            name: 'role',
            destinationName: 'role',
            ...baseMetadata,
          },
        ],
        ...baseMetadata,
      };

      const result = objectToSchema(data);

      expect(result.oneOf).toEqual([
        {
          properties: { role: { type: 'string', enum: ['admin'] } },
          required: ['role'],
        },
        {
          properties: { role: { type: 'string', enum: ['user'] } },
          required: ['role'],
        },
      ]);
    });

    it('should map not from payload', () => {
      const data: ApiObjectMetadata = {
        type: 'Object',
        name: 'restricted',
        destinationName: 'restricted',
        payload: {
          ...basePayload,
          not: { required: ['banned'] },
        },
        properties: [
          {
            type: 'String',
            name: 'banned',
            destinationName: 'banned',
            ...baseMetadata,
          },
        ],
        ...baseMetadata,
      };

      const result = objectToSchema(data);

      expect(result.not).toEqual({ required: ['banned'] });
    });

    it('should not include composition keys when payload has none', () => {
      const data: ApiObjectMetadata = {
        type: 'Object',
        name: 'simple',
        destinationName: 'simple',
        payload: { ...basePayload },
        properties: [],
        ...baseMetadata,
      };

      const result = objectToSchema(data);

      expect(result.allOf).toBeUndefined();
      expect(result.anyOf).toBeUndefined();
      expect(result.oneOf).toBeUndefined();
      expect(result.not).toBeUndefined();
    });
  });
});
