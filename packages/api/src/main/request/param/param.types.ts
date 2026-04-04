import type {
  AllowedTypesWithoutFunction,
  ArrayField,
  BasicTypes,
  BooleanField,
  FieldProps,
  NumberField,
  ObjectField,
  PayloadMetadata,
  PayloadProps,
  StringField,
} from '@lafken/common';

/**
 * Defines the JSON Schema constraints for a single property within a request body.
 * Each field maps directly to a standard JSON Schema keyword used in OpenAPI 3.0 schema definitions.
 */
export type PropertySchema = {
  /** Data type of the property. */
  type?: 'string' | 'number' | 'integer' | 'boolean';
  /** Restricts the value to a fixed set of allowed values. */
  enum?: unknown[];
  /** Restricts the value to an exact constant. */
  const?: unknown;
  /** Minimum allowed numeric value (inclusive). */
  minimum?: number;
  /** Maximum allowed numeric value (inclusive). */
  maximum?: number;
  /** Minimum allowed string length. */
  minLength?: number;
  /** Maximum allowed string length. */
  maxLength?: number;
  /** Regular expression pattern the string value must match. */
  pattern?: string;
  /** Semantic format hint (e.g., `email`, `uuid`, `date-time`). */
  format?: string;
  /** Whether the property accepts `null` as a valid value. */
  nullable?: boolean;
  /** Human-readable description rendered in OpenAPI documentation. */
  description?: string;
};

/**
 * Partial JSON Schema for a subset of properties of type `T`.
 * Used inside {@link SchemaCombiners} to express conditional validation rules.
 *
 * @typeParam T - The TypeScript type whose keys are referenced.
 */
export type PartialSchema<T> = {
  /** Per-property schema constraints. Only keys of `T` are allowed. */
  properties?: Partial<Record<keyof T, PropertySchema>>;
  /** List of property keys that must be present when this partial schema applies. */
  required?: (keyof T)[];
};

/**
 * JSON Schema composition keywords for expressing complex validation logic.
 * Only accepts properties defined in the body parameter (`BodyParam`).
 *
 * @typeParam T - The body parameter type whose properties can be referenced.
 */
export interface SchemaCombiners<T> {
  /** The payload must match exactly one of the given schemas. Only accepts `BodyParam` properties. */
  oneOf?: PartialSchema<T>[];
  /** The payload must match at least one of the given schemas. Only accepts `BodyParam` properties. */
  anyOf?: PartialSchema<T>[];
  /** The payload must match all of the given schemas. Only accepts `BodyParam` properties. */
  allOf?: PartialSchema<T>[];
  /** The payload must not match the given schema. Only accepts `BodyParam` properties. */
  not?: PartialSchema<T>;
}

/**
 * Configuration properties for an API request body payload.
 * Extends {@link PayloadProps} with OpenAPI schema composition via {@link SchemaCombiners}.
 *
 * @typeParam T - The TypeScript type representing the body parameter shape.
 */
export interface ApiPayloadProps<T> extends PayloadProps, SchemaCombiners<T> {
  /** Human-readable description of the request body rendered in OpenAPI documentation. */
  description?: string;
}
export interface ApiPayloadMetadata<T>
  extends Omit<ApiPayloadProps<T>, 'name'>,
    PayloadMetadata {}

export interface ObjectFieldWithSchemaProps extends Omit<ObjectField, 'payload'> {
  payload: ApiPayloadMetadata<any>;
}

/**
 * Base properties shared by all API parameter definitions.
 * Extends {@link FieldProps} to inherit core field configuration.
 * These properties map to common OpenAPI parameter attributes.
 */
export interface BaseParamProps extends FieldProps {
  /** Human-readable description rendered in OpenAPI documentation. */
  description?: string;
  /** Whether the parameter is mandatory. Maps to OpenAPI `required`. */
  required?: boolean;
  /** Example value displayed in generated API documentation. */
  example?: unknown;
  /** Marks the parameter as deprecated in the OpenAPI spec. */
  deprecated?: boolean;
  /** Marks the parameter as nullable in the OpenAPI spec. */
  nullable?: boolean;
}

/**
 * Properties for string-type API parameters.
 * Adds string-specific validation constraints that map to OpenAPI string schema attributes.
 */
export interface StringParamProps extends BaseParamProps {
  /** Minimum allowed length of the string value. Maps to OpenAPI `minLength`. */
  minLength?: number;
  /** Maximum allowed length of the string value. Maps to OpenAPI `maxLength`. */
  maxLength?: number;
  /** Regular expression pattern the string value must match. Maps to OpenAPI `pattern`. */
  pattern?: string;
  /**
   * Semantic format hint for the string value. Maps to OpenAPI `format`.
   * - `email` — RFC 5321 email address
   * - `uri` — RFC 3986 URI
   * - `uuid` — RFC 4122 UUID
   * - `date` — RFC 3339 full-date (e.g., `2026-02-23`)
   * - `date-time` — RFC 3339 date-time (e.g., `2026-02-23T10:00:00Z`)
   * - `simple` — Plain string without format constraints
   * - `password` — Hints UIs to mask the input
   */
  format?: 'email' | 'uri' | 'uuid' | 'date' | 'date-time' | 'simple' | 'password';
  /** Restricts the string to a fixed set of allowed values. Maps to OpenAPI `enum`. */
  enum?: string[];
}

/**
 * Properties for numeric API parameters (integer or float).
 * Adds numeric validation constraints that map to OpenAPI number/integer schema attributes.
 */
export interface NumberParamProps extends BaseParamProps {
  /** Minimum allowed value (inclusive). Maps to OpenAPI `minimum`. */
  min?: number;
  /** Maximum allowed value (inclusive). Maps to OpenAPI `maximum`. */
  max?: number;
  /** If `true`, the value must be strictly greater than `min`. Maps to OpenAPI `exclusiveMinimum`. */
  exclusiveMin?: boolean;
  /** If `true`, the value must be strictly less than `max`. Maps to OpenAPI `exclusiveMaximum`. */
  exclusiveMax?: boolean;
  /** The value must be a multiple of this number. Maps to OpenAPI `multipleOf`. */
  multipleOf?: number;
}

/**
 * Properties for boolean-type API parameters.
 * No additional constraints beyond {@link BaseParamProps}.
 */
export interface BooleanParamProps extends BaseParamProps {}

/**
 * Properties for array-type API parameters.
 * Adds array-specific validation constraints that map to OpenAPI array schema attributes.
 */
export interface ArrayParamProps extends BaseParamProps {
  /** Minimum number of items the array must contain. Maps to OpenAPI `minItems`. */
  minItems?: number;
  /** Maximum number of items the array may contain. Maps to OpenAPI `maxItems`. */
  maxItems?: number;
  /** Whether all items in the array must be unique. Maps to OpenAPI `uniqueItems`. */
  uniqueItems?: boolean;
}

/**
 * Conditional type that resolves the appropriate param props based on `T`.
 * Used for request body parameters where the TypeScript type determines
 * which OpenAPI schema constraints are applicable.
 *
 * - `string` → {@link StringParamProps}
 * - `number` → {@link NumberParamProps}
 * - `boolean` → {@link BooleanParamProps}
 * - `unknown[]` → {@link ArrayParamProps}
 * - Any other type → {@link BaseParamProps}
 *
 * @typeParam T - The TypeScript type of the body parameter field.
 */
export type BodyParamProps<T> = T extends string
  ? StringParamProps
  : T extends number
    ? NumberParamProps
    : T extends boolean
      ? BooleanParamProps
      : T extends unknown[]
        ? ArrayParamProps
        : BaseParamProps;

/**
 * Properties for HTTP header parameters.
 * Only primitive types (`string`, `number`, `integer`, `boolean`) are supported.
 */
export interface HeaderParamProps extends Pick<BaseParamProps, 'name' | 'required'> {
  /** Primitive type of the header value. Defaults to `string` if omitted. */
  type?: BasicTypes;
}

/**
 * Properties for URL path parameters (e.g., `/users/{id}`).
 * Path parameters are always required per OpenAPI spec and only support primitive types.
 */
export interface PathParamProps extends HeaderParamProps {}

/**
 * Properties for URL query string parameters (e.g., `?page=1&sort=name`).
 * Supports a broader set of types than path/header params, including arrays
 * and objects serialized as query parameters.
 */
export interface QueryParamProps extends Omit<HeaderParamProps, 'type'> {
  /** Type of the query parameter value. Supports primitives, arrays, and objects. */
  type?: AllowedTypesWithoutFunction;
}

/**
 * Properties for API Gateway request context parameters.
 * Provides access to API Gateway context variables at runtime
 * (e.g., `$context.requestId`, `$context.identity.sourceIp`).
 * These do not appear in the OpenAPI parameter list.
 */
export interface ContextParamProps {
  /** Primitive type to cast the context value to. Defaults to `string`. */
  type?: BasicTypes;
  /**
   * Name of the API Gateway context variable to extract.
   * Accepts well-known context fields or arbitrary strings for custom authorizer fields.
   */
  name:
    | 'accountId'
    | 'apiId'
    | 'authorizer.principalId'
    | 'domainName'
    | 'httpMethod'
    | 'identity.apiKey'
    | 'identity.apiKeyId'
    | 'identity.sourceIp'
    | 'path'
    | 'protocol'
    | 'requestId'
    | 'resourcePath'
    | (string & {});
}

/**
 * Base metadata attached to every resolved API parameter.
 * The `source` field indicates where the value is extracted from at runtime.
 */
export interface BaseParamMetadata {
  /** Origin of the parameter value in the HTTP request. */
  source: Source;
}

/**
 * Resolved metadata for a string API parameter.
 * Combines {@link StringField} structure, request {@link BaseParamMetadata | source},
 * and OpenAPI string constraints from {@link StringParamProps}.
 */
export interface ApiStringMetadata
  extends StringField,
    BaseParamMetadata,
    Omit<StringParamProps, 'type' | 'name'> {}

/**
 * Resolved metadata for a numeric API parameter.
 * Combines {@link NumberField} structure, request {@link BaseParamMetadata | source},
 * and OpenAPI numeric constraints from {@link NumberParamProps}.
 */
export interface ApiNumberMetadata
  extends NumberField,
    BaseParamMetadata,
    Omit<NumberParamProps, 'type' | 'name'> {}

/**
 * Resolved metadata for a boolean API parameter.
 * Combines {@link BooleanField} structure, request {@link BaseParamMetadata | source},
 * and OpenAPI boolean constraints from {@link BooleanParamProps}.
 */
export interface ApiBooleanMetadata
  extends BooleanField,
    BaseParamMetadata,
    Omit<BooleanParamProps, 'type' | 'name'> {}

/**
 * Resolved metadata for an object API parameter (typically a request body).
 * The `properties` field contains recursive {@link ApiParamMetadata} entries
 * to support nested object schemas in the OpenAPI spec.
 */
export interface ApiObjectMetadata
  extends Omit<ObjectFieldWithSchemaProps, 'properties'>,
    Omit<BaseParamProps, 'name' | 'type'>,
    BaseParamMetadata {
  /** Nested parameter definitions for each property of the object. */
  properties: ApiParamMetadata[];
}

/**
 * Resolved metadata for an array API parameter.
 * The `items` field is a recursive {@link ApiParamMetadata} that describes
 * the schema of array elements in the OpenAPI spec.
 */
export interface ApiArrayMetadata
  extends Omit<ArrayField, 'items'>,
    BaseParamMetadata,
    Omit<ArrayParamProps, 'type' | 'name'> {
  /** Schema definition for the items contained in the array. */
  items: ApiParamMetadata;
}

/**
 * Union of all resolved API parameter metadata types.
 * Used by resolvers to generate OpenAPI parameter and schema definitions.
 */
export type ApiParamMetadata =
  | ApiStringMetadata
  | ApiNumberMetadata
  | ApiBooleanMetadata
  | ApiObjectMetadata
  | ApiArrayMetadata;

/**
 * Origin of an API parameter within an HTTP request.
 * - `body` — Request body (OpenAPI `requestBody`)
 * - `path` — URL path segment (OpenAPI `in: path`)
 * - `query` — Query string (OpenAPI `in: query`)
 * - `header` — HTTP header (OpenAPI `in: header`)
 * - `context` — API Gateway request context (internal use only)
 */
export type Source = 'body' | 'path' | 'query' | 'header' | 'context';
