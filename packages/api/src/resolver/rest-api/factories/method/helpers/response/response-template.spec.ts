import { describe, expect, it } from 'vitest';
import type { ResponseObjectMetadata } from '../../../../../../main';
import { buildResponseTemplate } from './response-template';

const makeObject = (
  props: Partial<ResponseObjectMetadata> = {}
): ResponseObjectMetadata => ({
  type: 'Object',
  name: 'Root',
  destinationName: 'Root',
  properties: [],
  payload: { id: 'Root', name: 'Root', additionalProperties: false },
  ...props,
});

describe('buildResponseTemplate', () => {
  describe('primitive fields', () => {
    it('should quote String fields with $input.path', () => {
      const response = makeObject({
        properties: [
          { type: 'String', name: 'name', destinationName: 'name', required: true },
        ],
      });

      expect(buildResponseTemplate(response)).toBe(`{"name":"$input.path('$.name')"}`);
    });

    it('should not quote Number fields', () => {
      const response = makeObject({
        properties: [
          { type: 'Number', name: 'age', destinationName: 'age', required: true },
        ],
      });

      expect(buildResponseTemplate(response)).toBe(`{"age":$input.path('$.age')}`);
    });

    it('should not quote Boolean fields', () => {
      const response = makeObject({
        properties: [
          { type: 'Boolean', name: 'active', destinationName: 'active', required: true },
        ],
      });

      expect(buildResponseTemplate(response)).toBe(`{"active":$input.path('$.active')}`);
    });

    it('should not quote Any fields', () => {
      const response = makeObject({
        properties: [
          { type: 'Any', name: 'data', destinationName: 'data', required: true },
        ],
      });

      expect(buildResponseTemplate(response)).toBe(`{"data":$input.path('$.data')}`);
    });

    it('should build multiple primitive fields', () => {
      const response = makeObject({
        properties: [
          { type: 'String', name: 'name', destinationName: 'name', required: true },
          { type: 'Number', name: 'age', destinationName: 'age', required: true },
          { type: 'Boolean', name: 'active', destinationName: 'active', required: true },
        ],
      });

      expect(buildResponseTemplate(response)).toBe(
        `{"name":"$input.path('$.name')","age":$input.path('$.age'),"active":$input.path('$.active')}`
      );
    });
  });

  describe('custom template on field', () => {
    it('should use field.template directly when provided on a primitive', () => {
      const response = makeObject({
        properties: [
          {
            type: 'String',
            name: 'id',
            destinationName: 'id',
            required: true,
            template: "$input.path('$.nested.id')",
          },
        ],
      });

      expect(buildResponseTemplate(response)).toBe(`{"id":$input.path('$.nested.id')}`);
    });

    it('should use field.template directly when provided on a Number', () => {
      const response = makeObject({
        properties: [
          {
            type: 'Number',
            name: 'total',
            destinationName: 'total',
            required: true,
            template: "$input.path('$.meta.total')",
          },
        ],
      });

      expect(buildResponseTemplate(response)).toBe(
        `{"total":$input.path('$.meta.total')}`
      );
    });
  });

  describe('nested Object fields', () => {
    it('should recursively build nested object', () => {
      const address: ResponseObjectMetadata = {
        type: 'Object',
        name: 'address',
        destinationName: 'address',
        properties: [
          { type: 'String', name: 'street', destinationName: 'street', required: true },
          { type: 'String', name: 'city', destinationName: 'city', required: true },
        ],
        payload: { id: 'Address', name: 'Address', additionalProperties: false },
      };

      const response = makeObject({
        properties: [
          { type: 'String', name: 'name', destinationName: 'name', required: true },
          address,
        ],
      });

      expect(buildResponseTemplate(response)).toBe(
        `{"name":"$input.path('$.name')","address":{"street":"$input.path('$.address.street')","city":"$input.path('$.address.city')"}}`
      );
    });

    it('should recurse into deeply nested objects', () => {
      const geo: ResponseObjectMetadata = {
        type: 'Object',
        name: 'geo',
        destinationName: 'geo',
        properties: [
          { type: 'Number', name: 'lat', destinationName: 'lat', required: true },
          { type: 'Number', name: 'lng', destinationName: 'lng', required: true },
        ],
        payload: { id: 'Geo', name: 'Geo', additionalProperties: false },
      };

      const address: ResponseObjectMetadata = {
        type: 'Object',
        name: 'address',
        destinationName: 'address',
        properties: [
          { type: 'String', name: 'city', destinationName: 'city', required: true },
          geo,
        ],
        payload: { id: 'Address', name: 'Address', additionalProperties: false },
      };

      const response = makeObject({ properties: [address] });

      expect(buildResponseTemplate(response)).toBe(
        `{"address":{"city":"$input.path('$.address.city')","geo":{"lat":$input.path('$.address.geo.lat'),"lng":$input.path('$.address.geo.lng')}}}`
      );
    });
  });

  describe('Array fields', () => {
    it('should pass through array of primitives via $input.path', () => {
      const response = makeObject({
        properties: [
          {
            type: 'Array',
            name: 'tags',
            destinationName: 'tags',
            required: true,
            items: {
              type: 'String',
              name: 'tag',
              destinationName: 'tag',
              required: true,
            },
          },
        ],
      });

      expect(buildResponseTemplate(response)).toBe(`{"tags":$input.path('$.tags')}`);
    });

    it('should generate foreach for array of objects', () => {
      const response = makeObject({
        properties: [
          {
            type: 'Array',
            name: 'items',
            destinationName: 'items',
            required: true,
            items: {
              type: 'Object',
              name: 'item',
              destinationName: 'item',
              properties: [
                { type: 'String', name: 'id', destinationName: 'id', required: true },
                { type: 'Number', name: 'qty', destinationName: 'qty', required: true },
              ],
              payload: { id: 'Item', name: 'Item', additionalProperties: false },
            },
          },
        ],
      });

      expect(buildResponseTemplate(response)).toBe(
        `{"items":[#foreach($item in $input.path('$.items')){"id":"$item.id","qty":$item.qty}#if($foreach.hasNext),#end#end]}`
      );
    });

    it('should use array template when provided on array field', () => {
      const response = makeObject({
        properties: [
          {
            type: 'Array',
            name: 'items',
            destinationName: 'items',
            required: true,
            template: "$input.json('$.items')",
            items: {
              type: 'Object',
              name: 'item',
              destinationName: 'item',
              properties: [],
              payload: { id: 'Item', name: 'Item', additionalProperties: false },
            },
          },
        ],
      });

      expect(buildResponseTemplate(response)).toBe(`{"items":$input.json('$.items')}`);
    });

    it('should use custom template on foreach item fields', () => {
      const response = makeObject({
        properties: [
          {
            type: 'Array',
            name: 'users',
            destinationName: 'users',
            required: true,
            items: {
              type: 'Object',
              name: 'user',
              destinationName: 'user',
              properties: [
                {
                  type: 'String',
                  name: 'fullName',
                  destinationName: 'fullName',
                  required: true,
                  template: '"$item.firstName $item.lastName"',
                },
              ],
              payload: { id: 'User', name: 'User', additionalProperties: false },
            },
          },
        ],
      });

      expect(buildResponseTemplate(response)).toBe(
        `{"users":[#foreach($item in $input.path('$.users')){"fullName":"$item.firstName $item.lastName"}#if($foreach.hasNext),#end#end]}`
      );
    });
  });

  describe('mixed structures', () => {
    it('should handle object with mixed field types and custom templates', () => {
      const response = makeObject({
        properties: [
          { type: 'String', name: 'title', destinationName: 'title', required: true },
          { type: 'Number', name: 'count', destinationName: 'count', required: true },
          {
            type: 'String',
            name: 'ref',
            destinationName: 'ref',
            required: true,
            template: "$input.path('$.meta.ref')",
          },
          {
            type: 'Array',
            name: 'ids',
            destinationName: 'ids',
            required: true,
            items: {
              type: 'Number',
              name: 'id',
              destinationName: 'id',
              required: true,
            },
          },
        ],
      });

      expect(buildResponseTemplate(response)).toBe(
        `{"title":"$input.path('$.title')","count":$input.path('$.count'),"ref":$input.path('$.meta.ref'),"ids":$input.path('$.ids')}`
      );
    });
  });
});
