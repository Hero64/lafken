import { describe, expect, it } from 'vitest';
import type { ResponseArrayField, ResponseObjectMetadata } from '../../../../../../main';
import { ResponseTemplateHelper } from './response-template';

const helper = new ResponseTemplateHelper();

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

describe('ResponseTemplateHelper', () => {
  describe('primitive fields', () => {
    it('should quote String fields with $input.path', () => {
      const response = makeObject({
        properties: [
          { type: 'String', name: 'name', destinationName: 'name', required: true },
        ],
      });

      expect(helper.buildTemplate(response)).toBe(
        `{ #set($comma = "") $comma"name": "$input.path('$.name')" #set($comma = ",") }`
      );
    });

    it('should not quote Number fields', () => {
      const response = makeObject({
        properties: [
          { type: 'Number', name: 'age', destinationName: 'age', required: true },
        ],
      });

      expect(helper.buildTemplate(response)).toBe(
        `{ #set($comma = "") $comma"age": $input.path('$.age') #set($comma = ",") }`
      );
    });

    it('should not quote Boolean fields', () => {
      const response = makeObject({
        properties: [
          { type: 'Boolean', name: 'active', destinationName: 'active', required: true },
        ],
      });

      expect(helper.buildTemplate(response)).toBe(
        `{ #set($comma = "") $comma"active": $input.path('$.active') #set($comma = ",") }`
      );
    });

    it('should not quote Any fields', () => {
      const response = makeObject({
        properties: [
          { type: 'Any', name: 'data', destinationName: 'data', required: true },
        ],
      });

      expect(helper.buildTemplate(response)).toBe(
        `{ #set($comma = "") $comma"data": $input.path('$.data') #set($comma = ",") }`
      );
    });

    it('should build multiple primitive fields', () => {
      const response = makeObject({
        properties: [
          { type: 'String', name: 'name', destinationName: 'name', required: true },
          { type: 'Number', name: 'age', destinationName: 'age', required: true },
          { type: 'Boolean', name: 'active', destinationName: 'active', required: true },
        ],
      });

      expect(helper.buildTemplate(response)).toBe(
        `{ #set($comma = "") $comma"name": "$input.path('$.name')" #set($comma = ",")$comma"age": $input.path('$.age') #set($comma = ",")$comma"active": $input.path('$.active') #set($comma = ",") }`
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

      expect(helper.buildTemplate(response)).toBe(
        `{ #set($comma = "") $comma"id": "$input.path('$.nested.id')" #set($comma = ",") }`
      );
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

      expect(helper.buildTemplate(response)).toBe(
        `{ #set($comma = "") $comma"total": $input.path('$.meta.total') #set($comma = ",") }`
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

      expect(helper.buildTemplate(response)).toBe(
        `{ #set($comma = "") $comma"name": "$input.path('$.name')" #set($comma = ",")$comma"address": { #set($comma = "") $comma"street": "$input.path('$.address.street')" #set($comma = ",")$comma"city": "$input.path('$.address.city')" #set($comma = ",") } #set($comma = ",") }`
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

      expect(helper.buildTemplate(response)).toBe(
        `{ #set($comma = "") $comma"address": { #set($comma = "") $comma"city": "$input.path('$.address.city')" #set($comma = ",")$comma"geo": { #set($comma = "") $comma"lat": $input.path('$.address.geo.lat') #set($comma = ",")$comma"lng": $input.path('$.address.geo.lng') #set($comma = ",") } #set($comma = ",") } #set($comma = ",") }`
      );
    });
  });

  describe('Array fields', () => {
    it('should generate foreach for array of strings', () => {
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

      expect(helper.buildTemplate(response)).toBe(
        `{ #set($comma = "") $comma"tags": [#foreach($item0 in $input.path('$.tags')) "$item0" #if($foreach.hasNext),#end #end] #set($comma = ",") }`
      );
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

      expect(helper.buildTemplate(response)).toBe(
        `{ #set($comma = "") $comma"items": [#foreach($item0 in $input.path('$.items')) { #set($comma = "") $comma"id": "$item0.id" #set($comma = ",")$comma"qty": $item0.qty #set($comma = ",") } #if($foreach.hasNext),#end #end] #set($comma = ",") }`
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

      expect(helper.buildTemplate(response)).toBe(
        `{ #set($comma = "") $comma"items": $input.json('$.items') #set($comma = ",") }`
      );
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
                  template: '$item.firstName $item.lastName',
                },
              ],
              payload: { id: 'User', name: 'User', additionalProperties: false },
            },
          },
        ],
      });

      expect(helper.buildTemplate(response)).toBe(
        `{ #set($comma = "") $comma"users": [#foreach($item0 in $input.path('$.users')) { #set($comma = "") $comma"fullName": "$item.firstName $item.lastName" #set($comma = ",") } #if($foreach.hasNext),#end #end] #set($comma = ",") }`
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

      expect(helper.buildTemplate(response)).toBe(
        `{ #set($comma = "") $comma"title": "$input.path('$.title')" #set($comma = ",")$comma"count": $input.path('$.count') #set($comma = ",")$comma"ref": "$input.path('$.meta.ref')" #set($comma = ",")$comma"ids": [#foreach($item0 in $input.path('$.ids')) $item0 #if($foreach.hasNext),#end #end] #set($comma = ",") }`
      );
    });
  });

  describe('root Array', () => {
    it('should generate foreach for a root array of objects', () => {
      const response: ResponseArrayField = {
        type: 'Array',
        name: 'Root',
        destinationName: 'Root',
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
      };

      expect(helper.buildTemplate(response)).toBe(
        `[#foreach($item0 in $input.path('$')) { #set($comma = "") $comma"id": "$item0.id" #set($comma = ",")$comma"qty": $item0.qty #set($comma = ",") } #if($foreach.hasNext),#end #end]`
      );
    });

    it('should use template override on a root array', () => {
      const response: ResponseArrayField = {
        type: 'Array',
        name: 'Root',
        destinationName: 'Root',
        template: "$input.json('$')",
        items: {
          type: 'String',
          name: 'item',
          destinationName: 'item',
          required: true,
        },
      };

      expect(helper.buildTemplate(response)).toBe(`$input.json('$')`);
    });
  });
});
