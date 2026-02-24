import type {
  AllowedTypesWithoutFunction,
  ArrayField,
  BasicTypes,
  BooleanField,
  FieldProps,
  NumberField,
  ObjectField,
  StringField,
} from '@lafken/common';

/**
 * Base properties shared by all API parameter definitions.
 * Extends {@link FieldProps} to inherit core field configuration (name, type).
 * These properties map directly to common OpenAPI parameter attributes.
 */
export interface BaseParamProps extends FieldProps {
  /** Human-readable description of the parameter, rendered in OpenAPI documentation. */
  description?: string;
  /** Whether the parameter is mandatory. Maps to OpenAPI `required` field. */
  required?: boolean;
  /** An example value for the parameter, displayed in generated API documentation. */
  example?: unknown;
  /** Marks the parameter as deprecated in the OpenAPI specification. */
  deprecated?: boolean;
  /** Marks the parameter as nullable in the OpenAPI specification. * */
  nullable?: boolean;
}

/**
 * Properties for string-type API parameters.
 * Extends {@link BaseParamProps} with string-specific validation constraints
 * that map to OpenAPI string schema attributes.
 */
export interface StringParamProps extends BaseParamProps {
  /** Minimum allowed length of the string value. Maps to OpenAPI `minLength`. */
  minLength?: number;
  /** Maximum allowed length of the string value. Maps to OpenAPI `maxLength`. */
  maxLength?: number;
  /** Regular expression pattern that the string value must match. Maps to OpenAPI `pattern`. */
  pattern?: string;
  /**
   * Semantic format hint for the string value. Maps to OpenAPI `format`.
   * - `email` - RFC 5321 email address
   * - `uri` - RFC 3986 URI
   * - `uuid` - RFC 4122 UUID
   * - `date` - RFC 3339 full-date (e.g., `2026-02-23`)
   * - `date-time` - RFC 3339 date-time (e.g., `2026-02-23T10:00:00Z`)
   * - `simple` - Simple string without specific format constraints
   * - `password` - Hints UIs to mask the input
   */
  format?: 'email' | 'uri' | 'uuid' | 'date' | 'date-time' | 'simple' | 'password';
  /** Restricts the string to a fixed set of allowed values. Maps to OpenAPI `enum`. */
  enum?: string[];
}

/**
 * Properties for numeric API parameters (integer or float).
 * Extends {@link BaseParamProps} with numeric validation constraints
 * that map to OpenAPI number/integer schema attributes.
 */
export interface NumberParamProps extends BaseParamProps {
  /** Minimum allowed value (inclusive). Maps to OpenAPI `minimum`. */
  min?: number;
  /** Maximum allowed value (inclusive). Maps to OpenAPI `maximum`. */
  max?: number;
  /** Exclusive minimum — the value must be strictly greater than this. Maps to OpenAPI `exclusiveMinimum`. */
  exclusiveMin?: boolean;
  /** Exclusive maximum — the value must be strictly less than this. Maps to OpenAPI `exclusiveMaximum`. */
  exclusiveMax?: boolean;
  /** The value must be a multiple of this number. Maps to OpenAPI `multipleOf`. */
  multipleOf?: number;
}

/**
 * Properties for boolean-type API parameters.
 * Inherits all base properties from {@link BaseParamProps} without additional constraints,
 * since OpenAPI boolean schemas have no extra validation keywords.
 */
export interface BooleanParamProps extends BaseParamProps {}

/**
 * Properties for array-type API parameters.
 * Extends {@link BaseParamProps} with array-specific validation constraints
 * that map to OpenAPI array schema attributes.
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
 * Conditional type that resolves the appropriate parameter props based on the
 * inferred type `T`. Used primarily for request body parameters where the
 * TypeScript type determines which OpenAPI schema constraints are applicable.
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
 * Omits the inherited `type` field from {@link BaseParamProps} and re-declares it
 * as an optional {@link BasicTypes}, since headers only support primitive types
 * in OpenAPI (`string`, `number`, `integer`, `boolean`).
 */
export interface HeaderParamProps extends Omit<BaseParamProps, 'type'> {
  /** The primitive type of the header value. Defaults to `string` if omitted. */
  type?: BasicTypes;
}

/**
 * Properties for URL path parameters (e.g., `/users/{id}`).
 * Omits `required` (path params are always required per OpenAPI spec),
 * `nullable` (path segments cannot be null), and re-declares `type` as
 * an optional {@link BasicTypes} for primitive-only path segments.
 */
export interface PathParamProps
  extends Omit<HeaderParamProps, 'required' | 'nullable' | 'type'> {
  /** The primitive type of the path segment value. Defaults to `string` if omitted. */
  type?: BasicTypes;
}

/**
 * Properties for URL query string parameters (e.g., `?page=1&sort=name`).
 * Re-declares `type` as {@link AllowedTypesWithoutFunction} to support
 * a broader set of types than path/header params (including arrays and objects
 * serialized as query parameters), while excluding function types.
 */
export interface QueryParamProps extends Omit<HeaderParamProps, 'type'> {
  /** The type of the query parameter value. Supports primitives, arrays, and objects. */
  type?: AllowedTypesWithoutFunction;
}

/**
 * Properties for API Gateway request context parameters.
 * Provides access to API Gateway context variables that are available at runtime
 * (e.g., `$context.requestId`, `$context.identity.sourceIp`).
 *
 * These do not appear in the OpenAPI parameter list but are used internally
 * to inject API Gateway context values into Lambda handler arguments.
 */
export interface ContextParamProps {
  /** The primitive type to cast the context value to. Defaults to `string` if omitted. */
  type?: BasicTypes;
  /**
   * The name of the API Gateway context variable to extract.
   * Common values include well-known context fields; arbitrary strings
   * are also accepted for custom authorizer fields via `(string & {})`.
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
 * Base metadata interface attached to every resolved API parameter.
 * The `source` field indicates where the parameter value is extracted from
 * at runtime, and determines how it is mapped in the OpenAPI specification.
 */
export interface BaseParamMetadata {
  /** The origin of the parameter value in the HTTP request. */
  source: Source;
}

/**
 * Resolved metadata for a string API parameter.
 * Combines the structural definition from {@link StringField}, the request
 * source from {@link BaseParamMetadata}, and OpenAPI string constraints
 * from {@link StringParamProps} (excluding `type` and `name` which are
 * already provided by {@link StringField}).
 */
export interface ApiStringMetadata
  extends StringField,
    BaseParamMetadata,
    Omit<StringParamProps, 'type' | 'name'> {}

/**
 * Resolved metadata for a numeric API parameter.
 * Combines the structural definition from {@link NumberField}, the request
 * source from {@link BaseParamMetadata}, and OpenAPI numeric constraints
 * from {@link NumberParamProps} (excluding `type` and `name` which are
 * already provided by {@link NumberField}).
 */
export interface ApiNumberMetadata
  extends NumberField,
    BaseParamMetadata,
    Omit<NumberParamProps, 'type' | 'name'> {}

/**
 * Resolved metadata for a boolean API parameter.
 * Combines the structural definition from {@link BooleanField}, the request
 * source from {@link BaseParamMetadata}, and OpenAPI boolean constraints
 * from {@link BooleanParamProps} (excluding `type` and `name` which are
 * already provided by {@link BooleanField}).
 */
export interface ApiBooleanMetadata
  extends BooleanField,
    BaseParamMetadata,
    Omit<BooleanParamProps, 'type' | 'name'> {}

/**
 * Resolved metadata for an object API parameter (typically a request body).
 * Extends {@link ObjectField} (omitting `properties` to redefine it) and
 * {@link BaseParamMetadata}. The `properties` field is redefined as a recursive
 * {@link ApiParamMetadata} union to support nested object schemas in the
 * OpenAPI specification.
 */
export interface ApiObjectMetadata
  extends Omit<ObjectField, 'properties'>,
    Omit<BaseParamProps, 'name' | 'type'>,
    BaseParamMetadata {
  /** Nested parameter definitions for each property of the object. */
  properties: ApiParamMetadata[];
}

/**
 * Resolved metadata for an array API parameter.
 * Extends {@link ArrayField} (omitting `items` to redefine it),
 * {@link BaseParamMetadata}, and array constraints from {@link ArrayParamProps}.
 * The `items` field is redefined as a recursive {@link ApiParamMetadata} union
 * to describe the schema of array elements in the OpenAPI specification.
 */
export interface ApiArrayMetadata
  extends Omit<ArrayField, 'items'>,
    BaseParamMetadata,
    Omit<ArrayParamProps, 'type' | 'name'> {
  /** Schema definition for the items contained in the array. */
  items: ApiParamMetadata;
}

/**
 * Discriminated union of all possible resolved API parameter metadata types.
 * Used internally by resolvers to generate OpenAPI parameter and schema
 * definitions based on the decorated handler method signatures.
 *
 * The union covers all supported OpenAPI data types:
 * - {@link ApiStringMetadata} — string parameters
 * - {@link ApiNumberMetadata} — numeric parameters
 * - {@link ApiBooleanMetadata} — boolean parameters
 * - {@link ApiObjectMetadata} — object parameters (nested schemas)
 * - {@link ApiArrayMetadata} — array parameters (with typed items)
 */
export type ApiParamMetadata =
  | ApiStringMetadata
  | ApiNumberMetadata
  | ApiBooleanMetadata
  | ApiObjectMetadata
  | ApiArrayMetadata;

/**
 * Represents the origin of an API parameter within an HTTP request.
 * Determines how the parameter is extracted at runtime and where it
 * appears in the OpenAPI specification:
 *
 * - `body` — Extracted from the request body (OpenAPI `requestBody`)
 * - `path` — Extracted from URL path segments (OpenAPI `in: path`)
 * - `query` — Extracted from query string parameters (OpenAPI `in: query`)
 * - `header` — Extracted from HTTP headers (OpenAPI `in: header`)
 * - `context` — Extracted from API Gateway request context (internal use, not in OpenAPI params)
 */
export type Source = 'body' | 'path' | 'query' | 'header' | 'context';
