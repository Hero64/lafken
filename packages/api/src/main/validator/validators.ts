export type SchemaType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'array'
  | 'object'
  | 'null';

export interface SchemaDefinition {
  type?: SchemaType | SchemaType[];
  nullable?: boolean;
  required?: string[];
  enum?: unknown[];
  const?: unknown;

  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;

  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number | boolean;
  exclusiveMaximum?: number | boolean;
  multipleOf?: number;

  items?: SchemaDefinition;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;

  properties?: Record<string, SchemaDefinition>;
  additionalProperties?: boolean | SchemaDefinition;
  minProperties?: number;
  maxProperties?: number;

  allOf?: SchemaDefinition[];
  anyOf?: SchemaDefinition[];
  oneOf?: SchemaDefinition[];
  not?: SchemaDefinition;
}

export interface ValidationResult {
  valid: boolean;
  /**
   * Mirrors $context.error.validationErrorString from AWS API Gateway.
   * null when valid.
   * Single error  → bare string
   * Multiple      → "[err1, err2, ...]"
   */
  validationErrorString: string | null;
  errors: string[];
}

const FORMAT_VALIDATORS: Record<string, (v: string) => boolean> = {
  'date-time': (v) =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(v) &&
    !Number.isNaN(new Date(v).getTime()),
  date: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(v).getTime()),
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  uri: (v) => /^[a-zA-Z][\w+\-.]*:\/\/[^\s]+$/.test(v),
  uuid: (v) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v),
  ipv4: (v) =>
    /^(\d{1,3}\.){3}\d{1,3}$/.test(v) &&
    v
      .split('.')
      .map(Number)
      .every((o) => o >= 0 && o <= 255),
  ipv6: (v) => /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i.test(v),
  hostname: (v) =>
    /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(v),
};

export class SchemaValidator {
  private errors: string[] = [];

  /**
   * Validate any value against any schema.
   * The caller does not need to know whether the value comes from
   * a request body, a query param, a header, or anywhere else.
   */
  validate(value: unknown, schema: SchemaDefinition): ValidationResult {
    this.errors = [];
    this.check(value, schema, '');

    const valid = this.errors.length === 0;
    const errors = [...this.errors];
    const validationErrorString = valid
      ? null
      : errors.length === 1
        ? errors[0]
        : `[${errors.join(', ')}]`;

    return { valid, validationErrorString, errors };
  }

  private check(value: unknown, schema: SchemaDefinition, path: string): void {
    if (value === null || value === undefined) {
      if (schema.nullable) return;
      if (this.resolveTypes(schema).includes('null')) return;
      return;
    }

    if ('const' in schema) {
      if (value !== schema.const) {
        this.emit(
          `instance value (${JSON.stringify(value)}) does not match required value (${JSON.stringify(schema.const)})`,
          path
        );
      }
      return;
    }

    if (schema.enum !== undefined) {
      if (!schema.enum.some((e) => this.deepEqual(e, value))) {
        const possible = schema.enum.map((e) => JSON.stringify(e)).join(',');
        this.emit(
          `instance value (${JSON.stringify(value)}) not found in enum (possible values: [${possible}])`,
          path
        );
      }
      return;
    }

    if (schema.allOf) this.checkAllOf(value, schema.allOf, path);
    if (schema.anyOf) this.checkAnyOf(value, schema.anyOf, path);
    if (schema.oneOf) this.checkOneOf(value, schema.oneOf, path);
    if (schema.not) this.checkNot(value, schema.not, path);

    const types = this.resolveTypes(schema);
    if (types.length === 0) return;

    const matched = types.find((t) => this.matchesType(value, t));
    if (!matched) {
      const allowed = types.map((t) => `"${t}"`).join(',');
      this.emit(
        `instance type (${this.typeOf(value)}) does not match any allowed primitive type (allowed: [${allowed}])`,
        path
      );
      return;
    }

    switch (matched) {
      case 'string':
        this.checkString(value as string, schema, path);
        break;
      case 'number':
      case 'integer':
        this.checkNumber(value as number, schema, matched, path);
        break;
      case 'array':
        this.checkArray(value as unknown[], schema, path);
        break;
      case 'object':
        this.checkObject(value as Record<string, unknown>, schema, path);
        break;
    }
  }

  private checkString(value: string, schema: SchemaDefinition, path: string): void {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      this.emit(
        `string "${value}" is too short (length: ${value.length}, required minimum: ${schema.minLength})`,
        path
      );
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      this.emit(
        `string "${value}" is too long (length: ${value.length}, maximum allowed: ${schema.maxLength})`,
        path
      );
    }
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) {
      this.emit(
        `ECMA 262 regex "${schema.pattern}" does not match input string "${value}"`,
        path
      );
    }
    if (schema.format !== undefined) {
      const fn = FORMAT_VALIDATORS[schema.format];
      if (fn && !fn(value)) {
        this.emit(`string "${value}" is not a valid ${schema.format}`, path);
      }
    }
  }

  private checkNumber(
    value: number,
    schema: SchemaDefinition,
    type: 'number' | 'integer',
    path: string
  ): void {
    if (type === 'integer' && !Number.isInteger(value)) {
      this.emit(
        `instance type (number) does not match any allowed primitive type (allowed: ["integer"])`,
        path
      );
    }
    if (schema.minimum !== undefined) {
      const excl =
        typeof schema.exclusiveMinimum === 'boolean' && schema.exclusiveMinimum;
      if (excl ? value <= schema.minimum : value < schema.minimum) {
        this.emit(
          `numeric instance is not ${excl ? 'strictly greater than' : 'greater than or equal to'} the required minimum (minimum: ${schema.minimum}, found: ${value})`,
          path
        );
      }
    }
    if (typeof schema.exclusiveMinimum === 'number' && value <= schema.exclusiveMinimum) {
      this.emit(
        `numeric instance is not strictly greater than the required minimum (minimum: ${schema.exclusiveMinimum}, found: ${value})`,
        path
      );
    }
    if (schema.maximum !== undefined) {
      const excl =
        typeof schema.exclusiveMaximum === 'boolean' && schema.exclusiveMaximum;
      if (excl ? value >= schema.maximum : value > schema.maximum) {
        this.emit(
          `numeric instance is not ${excl ? 'strictly lower than' : 'lower than or equal to'} the required maximum (maximum: ${schema.maximum}, found: ${value})`,
          path
        );
      }
    }
    if (typeof schema.exclusiveMaximum === 'number' && value >= schema.exclusiveMaximum) {
      this.emit(
        `numeric instance is not strictly lower than the required maximum (maximum: ${schema.exclusiveMaximum}, found: ${value})`,
        path
      );
    }
    if (
      schema.multipleOf !== undefined &&
      Math.abs(value % schema.multipleOf) > Number.EPSILON
    ) {
      this.emit(
        `numeric instance is not a multiple of (divisor: ${schema.multipleOf})`,
        path
      );
    }
  }

  private checkArray(value: unknown[], schema: SchemaDefinition, path: string): void {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      this.emit(
        `array is too short: must have at least ${schema.minItems} elements but instance has ${value.length}`,
        path
      );
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      this.emit(
        `array is too long: must have at most ${schema.maxItems} elements but instance has ${value.length}`,
        path
      );
    }
    if (schema.uniqueItems) {
      const seen: unknown[] = [];
      for (const item of value) {
        if (seen.some((s) => this.deepEqual(s, item))) {
          this.emit('array must not contain duplicate elements', path);
          break;
        }
        seen.push(item);
      }
    }
    if (schema.items) {
      value.forEach((item, i) => {
        if (!schema.items) {
          return;
        }

        this.check(item, schema.items, `${path}[${i}]`);
      });
    }
  }

  private checkObject(
    value: Record<string, unknown>,
    schema: SchemaDefinition,
    path: string
  ): void {
    const keys = Object.keys(value);
    const prefix = path ? `${path}.` : '';

    if (schema.required) {
      const missing = schema.required.filter(
        (f) => !(f in value) || value[f] === undefined
      );
      if (missing.length > 0) {
        this.emit(
          `object has missing required properties ([${missing.map((f) => `"${f}"`).join(',')}])`,
          path
        );
      }
    }
    if (schema.minProperties !== undefined && keys.length < schema.minProperties) {
      this.emit(
        `object instance has properties which are fewer than the required minimum (minimum: ${schema.minProperties}, found: ${keys.length})`,
        path
      );
    }
    if (schema.maxProperties !== undefined && keys.length > schema.maxProperties) {
      this.emit(
        `object instance has properties which are more than the required maximum (maximum: ${schema.maxProperties}, found: ${keys.length})`,
        path
      );
    }
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in value) {
          this.check(value[key], propSchema, `${prefix}${key}`);
        }
      }
    }
    if (schema.additionalProperties !== undefined && schema.properties) {
      const known = new Set(Object.keys(schema.properties));
      const extra = keys.filter((k) => !known.has(k));
      if (schema.additionalProperties === false) {
        for (const k of extra) {
          this.emit(
            `object instance has properties which are not allowed by the schema: ["${k}"]`,
            path
          );
        }
      } else if (typeof schema.additionalProperties === 'object') {
        for (const k of extra) {
          this.check(
            value[k],
            schema.additionalProperties as SchemaDefinition,
            `${prefix}${k}`
          );
        }
      }
    }
  }

  private checkAllOf(value: unknown, schemas: SchemaDefinition[], path: string): void {
    for (const s of schemas) this.check(value, s, path);
  }

  private checkAnyOf(value: unknown, schemas: SchemaDefinition[], path: string): void {
    if (!schemas.some((s) => new SchemaValidator().validate(value, s).valid)) {
      this.emit(
        'instance failed to match at least one required schema among a list of schemas',
        path
      );
    }
  }

  private checkOneOf(value: unknown, schemas: SchemaDefinition[], path: string): void {
    const count = schemas.filter(
      (s) => new SchemaValidator().validate(value, s).valid
    ).length;
    if (count !== 1) {
      this.emit(
        `instance failed to match exactly one schema (matched ${count} out of ${schemas.length})`,
        path
      );
    }
  }

  private checkNot(value: unknown, schema: SchemaDefinition, path: string): void {
    if (new SchemaValidator().validate(value, schema).valid) {
      this.emit('subject must not be valid against schema', path);
    }
  }

  /** Emits a message in the exact format API Gateway uses:
   *  no path → bare message
   *  with path → "[path]: message"
   */
  private emit(msg: string, path: string): void {
    this.errors.push(path ? `[${path}]: ${msg}` : msg);
  }

  private resolveTypes(schema: SchemaDefinition): SchemaType[] {
    if (!schema.type) return [];
    return Array.isArray(schema.type) ? schema.type : [schema.type];
  }

  private matchesType(value: unknown, type: SchemaType): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !Number.isNaN(value);
      case 'integer':
        return typeof value === 'number' && Number.isInteger(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return value !== null && !Array.isArray(value) && typeof value === 'object';
      case 'null':
        return value === null;
      default:
        return false;
    }
  }

  private typeOf(value: unknown): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b || typeof a !== 'object' || !a || !b) return false;
    const ka = Object.keys(a as object).sort();
    const kb = Object.keys(b as object).sort();
    if (ka.join() !== kb.join()) return false;
    return ka.every((k) =>
      this.deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])
    );
  }
}
