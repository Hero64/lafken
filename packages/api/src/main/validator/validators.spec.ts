import { describe, expect, it } from 'vitest';
import type { SchemaDefinition } from './validators';
import { SchemaValidator } from './validators';

const v = new SchemaValidator();
const valid = (value: unknown, schema: SchemaDefinition) => v.validate(value, schema);

describe('SchemaValidator', () => {
  // ── Type matching ──────────────────────────────────────────────────────

  describe('type matching', () => {
    it('should accept string for type "string"', () => {
      expect(valid('hello', { type: 'string' }).valid).toBe(true);
    });

    it('should reject number for type "string"', () => {
      const r = valid(42, { type: 'string' });
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toContain('does not match any allowed primitive type');
    });

    it('should accept number for type "number"', () => {
      expect(valid(3.14, { type: 'number' }).valid).toBe(true);
    });

    it('should accept integer for type "integer"', () => {
      expect(valid(5, { type: 'integer' }).valid).toBe(true);
    });

    it('should reject float for type "integer"', () => {
      expect(valid(5.5, { type: 'integer' }).valid).toBe(false);
    });

    it('should accept boolean for type "boolean"', () => {
      expect(valid(true, { type: 'boolean' }).valid).toBe(true);
    });

    it('should accept array for type "array"', () => {
      expect(valid([1, 2], { type: 'array' }).valid).toBe(true);
    });

    it('should accept object for type "object"', () => {
      expect(valid({ a: 1 }, { type: 'object' }).valid).toBe(true);
    });

    it('should accept null for type "null"', () => {
      expect(valid(null, { type: 'null' }).valid).toBe(true);
    });

    it('should accept value matching any type in a union', () => {
      expect(valid('hi', { type: ['string', 'number'] }).valid).toBe(true);
      expect(valid(42, { type: ['string', 'number'] }).valid).toBe(true);
    });

    it('should reject value not matching any type in a union', () => {
      expect(valid(true, { type: ['string', 'number'] }).valid).toBe(false);
    });

    it('should pass when schema has no type', () => {
      expect(valid('anything', {}).valid).toBe(true);
    });
  });

  // ── Null / undefined handling ──────────────────────────────────────────

  describe('null and undefined', () => {
    it('should accept null when nullable is true', () => {
      expect(valid(null, { type: 'string', nullable: true }).valid).toBe(true);
    });

    it('should accept undefined silently (missing fields caught by required)', () => {
      expect(valid(undefined, { type: 'string' }).valid).toBe(true);
    });

    it('should accept null when type includes "null"', () => {
      expect(valid(null, { type: ['string', 'null'] }).valid).toBe(true);
    });
  });

  // ── const ──────────────────────────────────────────────────────────────

  describe('const', () => {
    it('should accept value equal to const', () => {
      expect(valid('fixed', { const: 'fixed' }).valid).toBe(true);
    });

    it('should reject value not equal to const', () => {
      const r = valid('other', { const: 'fixed' });
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toContain('does not match required value');
    });
  });

  // ── enum ───────────────────────────────────────────────────────────────

  describe('enum', () => {
    it('should accept value in enum', () => {
      expect(valid('a', { enum: ['a', 'b', 'c'] }).valid).toBe(true);
    });

    it('should reject value not in enum', () => {
      const r = valid('d', { enum: ['a', 'b', 'c'] });
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toContain('not found in enum');
    });

    it('should handle deep equal for objects in enum', () => {
      expect(valid({ x: 1 }, { enum: [{ x: 1 }, { x: 2 }] }).valid).toBe(true);
      expect(valid({ x: 3 }, { enum: [{ x: 1 }, { x: 2 }] }).valid).toBe(false);
    });
  });

  // ── String constraints ─────────────────────────────────────────────────

  describe('string constraints', () => {
    it('should enforce minLength', () => {
      expect(valid('ab', { type: 'string', minLength: 2 }).valid).toBe(true);
      const r = valid('a', { type: 'string', minLength: 2 });
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toContain('is too short');
    });

    it('should enforce maxLength', () => {
      expect(valid('ab', { type: 'string', maxLength: 2 }).valid).toBe(true);
      const r = valid('abc', { type: 'string', maxLength: 2 });
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toContain('is too long');
    });

    it('should enforce pattern', () => {
      expect(valid('abc', { type: 'string', pattern: '^[a-z]+$' }).valid).toBe(true);
      const r = valid('123', { type: 'string', pattern: '^[a-z]+$' });
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toContain('does not match input string');
    });

    it('should enforce format "email"', () => {
      expect(valid('a@b.com', { type: 'string', format: 'email' }).valid).toBe(true);
      expect(valid('notanemail', { type: 'string', format: 'email' }).valid).toBe(false);
    });

    it('should enforce format "uuid"', () => {
      expect(
        valid('550e8400-e29b-41d4-a716-446655440000', {
          type: 'string',
          format: 'uuid',
        }).valid
      ).toBe(true);
      expect(valid('not-a-uuid', { type: 'string', format: 'uuid' }).valid).toBe(false);
    });

    it('should enforce format "date"', () => {
      expect(valid('2026-04-18', { type: 'string', format: 'date' }).valid).toBe(true);
      expect(valid('18-04-2026', { type: 'string', format: 'date' }).valid).toBe(false);
    });

    it('should enforce format "date-time"', () => {
      expect(
        valid('2026-04-18T10:00:00Z', { type: 'string', format: 'date-time' }).valid
      ).toBe(true);
      expect(valid('2026-04-18', { type: 'string', format: 'date-time' }).valid).toBe(
        false
      );
    });

    it('should enforce format "uri"', () => {
      expect(valid('https://example.com', { type: 'string', format: 'uri' }).valid).toBe(
        true
      );
      expect(valid('not a uri', { type: 'string', format: 'uri' }).valid).toBe(false);
    });

    it('should enforce format "ipv4"', () => {
      expect(valid('192.168.1.1', { type: 'string', format: 'ipv4' }).valid).toBe(true);
      expect(valid('999.999.999.999', { type: 'string', format: 'ipv4' }).valid).toBe(
        false
      );
    });

    it('should enforce format "ipv6"', () => {
      expect(
        valid('2001:0db8:85a3:0000:0000:8a2e:0370:7334', {
          type: 'string',
          format: 'ipv6',
        }).valid
      ).toBe(true);
      expect(valid('not-ipv6', { type: 'string', format: 'ipv6' }).valid).toBe(false);
    });

    it('should enforce format "hostname"', () => {
      expect(valid('example.com', { type: 'string', format: 'hostname' }).valid).toBe(
        true
      );
      expect(valid('-invalid', { type: 'string', format: 'hostname' }).valid).toBe(false);
    });

    it('should ignore unknown formats', () => {
      expect(valid('anything', { type: 'string', format: 'custom' }).valid).toBe(true);
    });
  });

  // ── Number constraints ─────────────────────────────────────────────────

  describe('number constraints', () => {
    it('should enforce minimum (inclusive)', () => {
      expect(valid(5, { type: 'number', minimum: 5 }).valid).toBe(true);
      const r = valid(4, { type: 'number', minimum: 5 });
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toContain('greater than or equal to');
    });

    it('should enforce maximum (inclusive)', () => {
      expect(valid(10, { type: 'number', maximum: 10 }).valid).toBe(true);
      const r = valid(11, { type: 'number', maximum: 10 });
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toContain('lower than or equal to');
    });

    it('should enforce exclusiveMinimum as boolean', () => {
      const schema: SchemaDefinition = {
        type: 'number',
        minimum: 5,
        exclusiveMinimum: true,
      };
      expect(valid(6, schema).valid).toBe(true);
      const r = valid(5, schema);
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toContain('strictly greater than');
    });

    it('should enforce exclusiveMinimum as number', () => {
      const schema: SchemaDefinition = { type: 'number', exclusiveMinimum: 5 };
      expect(valid(6, schema).valid).toBe(true);
      expect(valid(5, schema).valid).toBe(false);
    });

    it('should enforce exclusiveMaximum as boolean', () => {
      const schema: SchemaDefinition = {
        type: 'number',
        maximum: 10,
        exclusiveMaximum: true,
      };
      expect(valid(9, schema).valid).toBe(true);
      const r = valid(10, schema);
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toContain('strictly lower than');
    });

    it('should enforce exclusiveMaximum as number', () => {
      const schema: SchemaDefinition = { type: 'number', exclusiveMaximum: 10 };
      expect(valid(9, schema).valid).toBe(true);
      expect(valid(10, schema).valid).toBe(false);
    });

    it('should enforce multipleOf', () => {
      expect(valid(6, { type: 'number', multipleOf: 3 }).valid).toBe(true);
      const r = valid(7, { type: 'number', multipleOf: 3 });
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toContain('not a multiple of');
    });
  });

  // ── Array constraints ──────────────────────────────────────────────────

  describe('array constraints', () => {
    it('should enforce minItems', () => {
      expect(valid([1, 2], { type: 'array', minItems: 2 }).valid).toBe(true);
      const r = valid([1], { type: 'array', minItems: 2 });
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toContain('too short');
    });

    it('should enforce maxItems', () => {
      expect(valid([1, 2], { type: 'array', maxItems: 2 }).valid).toBe(true);
      const r = valid([1, 2, 3], { type: 'array', maxItems: 2 });
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toContain('too long');
    });

    it('should enforce uniqueItems', () => {
      expect(valid([1, 2, 3], { type: 'array', uniqueItems: true }).valid).toBe(true);
      const r = valid([1, 2, 2], { type: 'array', uniqueItems: true });
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toContain('duplicate');
    });

    it('should enforce uniqueItems with deep equal', () => {
      expect(
        valid([{ a: 1 }, { a: 1 }], { type: 'array', uniqueItems: true }).valid
      ).toBe(false);
    });

    it('should validate each item against items schema', () => {
      const schema: SchemaDefinition = {
        type: 'array',
        items: { type: 'number', minimum: 0 },
      };
      expect(valid([1, 2, 3], schema).valid).toBe(true);
      const r = valid([1, -1, 3], schema);
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toContain('[1]');
    });
  });

  // ── Object constraints ─────────────────────────────────────────────────

  describe('object constraints', () => {
    it('should enforce required properties', () => {
      const schema: SchemaDefinition = {
        type: 'object',
        required: ['name', 'age'],
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
      };
      expect(valid({ name: 'Alice', age: 30 }, schema).valid).toBe(true);
      const r = valid({ name: 'Alice' }, schema);
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toContain('missing required properties');
      expect(r.errors[0]).toContain('"age"');
    });

    it('should treat undefined values as missing for required check', () => {
      const schema: SchemaDefinition = {
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string' } },
      };
      expect(valid({ name: undefined }, schema).valid).toBe(false);
    });

    it('should validate property types', () => {
      const schema: SchemaDefinition = {
        type: 'object',
        properties: {
          count: { type: 'number' },
        },
      };
      expect(valid({ count: 5 }, schema).valid).toBe(true);
      const r = valid({ count: 'five' }, schema);
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toContain('count');
    });

    it('should enforce minProperties', () => {
      expect(valid({ a: 1, b: 2 }, { type: 'object', minProperties: 2 }).valid).toBe(
        true
      );
      const r = valid({ a: 1 }, { type: 'object', minProperties: 2 });
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toContain('fewer than the required minimum');
    });

    it('should enforce maxProperties', () => {
      expect(valid({ a: 1 }, { type: 'object', maxProperties: 1 }).valid).toBe(true);
      const r = valid({ a: 1, b: 2 }, { type: 'object', maxProperties: 1 });
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toContain('more than the required maximum');
    });

    it('should reject additional properties when false', () => {
      const schema: SchemaDefinition = {
        type: 'object',
        properties: { name: { type: 'string' } },
        additionalProperties: false,
      };
      expect(valid({ name: 'Alice' }, schema).valid).toBe(true);
      const r = valid({ name: 'Alice', extra: true }, schema);
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toContain('not allowed by the schema');
      expect(r.errors[0]).toContain('"extra"');
    });

    it('should validate additional properties against schema', () => {
      const schema: SchemaDefinition = {
        type: 'object',
        properties: { name: { type: 'string' } },
        additionalProperties: { type: 'number' },
      };
      expect(valid({ name: 'Alice', score: 10 }, schema).valid).toBe(true);
      expect(valid({ name: 'Alice', score: 'ten' }, schema).valid).toBe(false);
    });

    it('should validate nested object properties with path', () => {
      const schema: SchemaDefinition = {
        type: 'object',
        properties: {
          address: {
            type: 'object',
            required: ['city'],
            properties: { city: { type: 'string' } },
          },
        },
      };
      const r = valid({ address: {} }, schema);
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toContain('address');
      expect(r.errors[0]).toContain('missing required properties');
    });
  });

  // ── Composition: allOf ─────────────────────────────────────────────────

  describe('allOf', () => {
    it('should pass when value matches all schemas', () => {
      const schema: SchemaDefinition = {
        allOf: [
          { type: 'object', required: ['name'] },
          { type: 'object', required: ['age'] },
        ],
      };
      expect(valid({ name: 'Alice', age: 30 }, schema).valid).toBe(true);
    });

    it('should fail when value does not match one schema', () => {
      const schema: SchemaDefinition = {
        allOf: [
          { type: 'object', required: ['name'] },
          { type: 'object', required: ['age'] },
        ],
      };
      const r = valid({ name: 'Alice' }, schema);
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toContain('"age"');
    });
  });

  // ── Composition: anyOf ─────────────────────────────────────────────────

  describe('anyOf', () => {
    it('should pass when value matches at least one schema', () => {
      const schema: SchemaDefinition = {
        anyOf: [{ type: 'string' }, { type: 'number' }],
      };
      expect(valid('hi', schema).valid).toBe(true);
      expect(valid(42, schema).valid).toBe(true);
    });

    it('should fail when value matches no schema', () => {
      const schema: SchemaDefinition = {
        anyOf: [{ type: 'string' }, { type: 'number' }],
      };
      const r = valid(true, schema);
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toContain('at least one required schema');
    });
  });

  // ── Composition: oneOf ─────────────────────────────────────────────────

  describe('oneOf', () => {
    it('should pass when value matches exactly one schema', () => {
      const schema: SchemaDefinition = {
        oneOf: [
          { type: 'number', minimum: 10 },
          { type: 'number', maximum: 5 },
        ],
      };
      expect(valid(15, schema).valid).toBe(true);
      expect(valid(3, schema).valid).toBe(true);
    });

    it('should fail when value matches zero schemas', () => {
      const schema: SchemaDefinition = {
        oneOf: [
          { type: 'number', minimum: 10 },
          { type: 'number', maximum: 5 },
        ],
      };
      const r = valid(7, schema);
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toContain('matched 0 out of 2');
    });

    it('should fail when value matches more than one schema', () => {
      const schema: SchemaDefinition = {
        oneOf: [{ type: 'number' }, { type: 'number', minimum: 0 }],
      };
      const r = valid(5, schema);
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toContain('matched 2 out of 2');
    });
  });

  // ── Composition: not ───────────────────────────────────────────────────

  describe('not', () => {
    it('should pass when value does not match schema', () => {
      expect(valid('hello', { not: { type: 'number' } }).valid).toBe(true);
    });

    it('should fail when value matches schema', () => {
      const r = valid(42, { not: { type: 'number' } });
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toContain('must not be valid against schema');
    });
  });

  // ── ValidationResult format ────────────────────────────────────────────

  describe('ValidationResult format', () => {
    it('should return null validationErrorString when valid', () => {
      const r = valid('ok', { type: 'string' });
      expect(r.validationErrorString).toBeNull();
      expect(r.errors).toEqual([]);
    });

    it('should return bare string for a single error', () => {
      const r = valid(42, { type: 'string' });
      expect(r.validationErrorString).toBe(r.errors[0]);
    });

    it('should return bracketed string for multiple errors', () => {
      const schema: SchemaDefinition = {
        type: 'object',
        required: ['a', 'b'],
        properties: {
          a: { type: 'string' },
          b: { type: 'string' },
          c: { type: 'number' },
        },
      };
      const r = valid({ c: 'wrong' }, schema);
      expect(r.errors.length).toBeGreaterThan(1);
      expect(r.validationErrorString).toBe(`[${r.errors.join(', ')}]`);
    });

    it('should include path in error messages', () => {
      const schema: SchemaDefinition = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { type: 'string', minLength: 3 },
          },
        },
      };
      const r = valid({ items: ['hello', 'no'] }, schema);
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toContain('[items[1]]');
    });
  });

  // ── Complex / integration scenarios ────────────────────────────────────

  describe('complex schemas', () => {
    it('should validate a nested object with arrays', () => {
      const schema: SchemaDefinition = {
        type: 'object',
        required: ['name', 'tags'],
        properties: {
          name: { type: 'string', minLength: 1 },
          tags: {
            type: 'array',
            minItems: 1,
            items: { type: 'string' },
          },
          address: {
            type: 'object',
            required: ['city'],
            properties: {
              city: { type: 'string' },
              zip: { type: 'string', pattern: '^\\d{5}$' },
            },
          },
        },
      };

      expect(
        valid(
          { name: 'Alice', tags: ['dev'], address: { city: 'NYC', zip: '10001' } },
          schema
        ).valid
      ).toBe(true);

      const r = valid({ name: '', tags: [], address: { zip: 'bad' } }, schema);
      expect(r.valid).toBe(false);
      expect(r.errors.length).toBeGreaterThanOrEqual(3);
    });

    it('should validate each instance independently (no state leaking)', () => {
      const schema: SchemaDefinition = { type: 'string', minLength: 5 };
      valid('ab', schema);
      const r = valid('hello', schema);
      expect(r.valid).toBe(true);
      expect(r.errors).toEqual([]);
    });
  });
});
