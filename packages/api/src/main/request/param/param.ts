import 'reflect-metadata';
import { createFieldDecorator, type OnlyTypeKeys, type Primitive } from '@lafken/common';
import { RESOURCE_TYPE } from '../../type/type';
import type {
  ApiParamMetadata,
  BodyParamProps,
  ContextParamProps,
  HeaderParamProps,
  PathParamProps,
  QueryParamProps,
  VelocityParamProps,
} from './param.types';

export const PARAM_PREFIX = `${RESOURCE_TYPE}_REQUEST` as const;

/**
 * Property decorator that marks a class field as an HTTP **request body** parameter.
 * The decorated field will be mapped to the `requestBody` section of the generated
 * OpenAPI specification.
 *
 * The constraint type `BodyParamProps<T[P]>` is resolved at compile time based on
 * the field's TypeScript type, so string fields receive string-specific options
 * (e.g., `minLength`, `pattern`), number fields receive numeric options, etc.
 *
 * By default, body parameters are marked as **required** unless explicitly
 * overridden via `props.required`.
 *
 * @typeParam T - The class type that owns the decorated property.
 * @typeParam P - The property key being decorated.
 * @param props - Optional configuration conforming to the type-resolved {@link BodyParamProps}.
 *
 * @example
 * ```typescript
 * class CreateUserBody {
 *   @BodyParam({ minLength: 1, maxLength: 100 })
 *   name: string;
 *
 *   @BodyParam({ min: 0 })
 *   age: number;
 * }
 * ```
 */
export const BodyParam =
  <T, P extends keyof T>(props?: BodyParamProps<T[P]>) =>
  (target: T, destination: P): void => {
    createFieldDecorator<BodyParamProps<T[P]>, ApiParamMetadata>({
      prefix: PARAM_PREFIX,
      getMetadata: (props) => {
        return {
          ...props,
          required: props?.required ?? true,
          source: 'body',
        };
      },
    })(props)(target, destination as string);
  };

/**
 * Property decorator that marks a class field as an HTTP **query string** parameter.
 * The decorated field will appear in the `parameters` section of the OpenAPI
 * specification with `in: query`.
 *
 * Only properties whose type is assignable to `Primitive | Primitive[]` can be
 * decorated, ensuring type-safe query parameter definitions. Query parameters
 * are **optional** by default (no `required` override is applied).
 *
 * @typeParam T - The class type that owns the decorated property.
 * @param props - Optional {@link QueryParamProps} to configure the query parameter schema.
 *
 * @example
 * ```typescript
 * class ListUsersQuery {
 *   @QueryParam({ description: 'Page number' })
 *   page: number;
 *
 *   @QueryParam()
 *   sort: string;
 * }
 * ```
 */
export const QueryParam =
  <T, P extends keyof T>(props?: QueryParamProps<T[P]>) =>
  (target: T, destination: string): void => {
    createFieldDecorator<QueryParamProps<T[P]>, ApiParamMetadata>({
      prefix: PARAM_PREFIX,
      getMetadata: (props) => {
        return {
          ...props,
          required: props?.required ?? true,
          source: 'query',
        };
      },
    })(props)(target, destination as string);
  };

/**
 * Property decorator that marks a class field as a **URL path** parameter.
 * The decorated field will appear in the `parameters` section of the OpenAPI
 * specification with `in: path`.
 *
 * Path parameters are **always required** per the OpenAPI specification, so
 * the `required` flag is unconditionally set to `true`. Only fields whose
 * type is assignable to `Primitive` are allowed, since path segments must
 * be scalar values.
 *
 * @typeParam T - The class type that owns the decorated property.
 * @param props - Optional {@link PathParamProps} to configure the path parameter schema.
 *
 * @example
 * ```typescript
 * class GetUserPath {
 *   @PathParam({ description: 'The unique user identifier' })
 *   id: string;
 * }
 * ```
 */

export const PathParam =
  <T, P extends keyof T>(props?: PathParamProps<T[P]>) =>
  (target: T, destination: OnlyTypeKeys<T, Primitive>): void => {
    createFieldDecorator<PathParamProps<T[P]>, ApiParamMetadata>({
      prefix: PARAM_PREFIX,
      getMetadata: (props) => {
        return {
          ...props,
          required: true,
          source: 'path',
        };
      },
    })(props)(target, destination as string);
  };

/**
 * Property decorator that marks a class field as an **HTTP header** parameter.
 * The decorated field will appear in the `parameters` section of the OpenAPI
 * specification with `in: header`.
 *
 * Header parameters are marked as **required** by default unless explicitly
 * overridden via `props.required`. Only fields whose type is assignable to
 * `Primitive` are allowed, since HTTP headers carry scalar values.
 *
 * @typeParam T - The class type that owns the decorated property.
 * @param props - Optional {@link HeaderParamProps} to configure the header parameter schema.
 *
 * @example
 * ```typescript
 * class AuthHeaders {
 *   @HeaderParam({ description: 'Bearer token for authentication' })
 *   authorization: string;
 *
 *   @HeaderParam({ required: false })
 *   'x-request-id': string;
 * }
 * ```
 */
export const HeaderParam =
  <T>(props?: HeaderParamProps) =>
  (target: T, destination: OnlyTypeKeys<T, Primitive>): void => {
    createFieldDecorator<HeaderParamProps, ApiParamMetadata>({
      prefix: PARAM_PREFIX,
      getMetadata: (props) => {
        return {
          ...props,
          required: props?.required ?? true,
          source: 'header',
        };
      },
    })(props)(target, destination as string);
  };

/**
 * Property decorator that marks a class field as an **API Gateway request context** parameter.
 * Context parameters are **not** included in the OpenAPI parameter list; instead,
 * they are used internally to inject API Gateway context variables
 * (e.g., `$context.requestId`, `$context.identity.sourceIp`) into Lambda
 * handler arguments at runtime.
 *
 * Context parameters are **always required** since they are populated by the
 * API Gateway itself. Only fields whose type is assignable to `Primitive`
 * are accepted.
 *
 * @typeParam T - The class type that owns the decorated property.
 * @param props - Optional {@link ContextParamProps} specifying the context variable `name` to extract.
 *
 * @example
 * ```typescript
 * class RequestContext {
 *   @ContextParam({ name: 'requestId' })
 *   requestId: string;
 *
 *   @ContextParam({ name: 'identity.sourceIp' })
 *   sourceIp: string;
 * }
 * ```
 */
export const ContextParam =
  <T>(props?: ContextParamProps) =>
  (target: T, destination: OnlyTypeKeys<T, Primitive>): void => {
    createFieldDecorator<ContextParamProps, ApiParamMetadata>({
      prefix: PARAM_PREFIX,
      getMetadata: (props) => {
        return {
          ...props,
          required: true,
          source: 'context',
        };
      },
    })(props)(target, destination as string);
  };

/**
 * Property decorator that generates a raw Apache Velocity template expression
 * directly in the API Gateway request mapping template.
 *
 * Unlike other parameter decorators that derive the template from the field type
 * and source, `VelocityParam` lets you provide an arbitrary Velocity expression
 * via `props.template`. The decorated property name becomes the JSON key in the
 * generated template, and the template expression becomes its value.
 *
 * @param props - Optional {@link VelocityParamProps} with the Velocity `template` expression.
 *
 * @example
 * ```typescript
 * class RequestBody {
 *   @BodyParam()
 *   name: string;
 *
 *   @VelocityParam({ template: "$input.json('$')" })
 *   data: any;
 * }
 * // Generated template output:
 * // "data": $input.json('$')
 * ```
 */
export const VelocityParam =
  (props?: VelocityParamProps) =>
  (target: any, destination: string): void => {
    createFieldDecorator<
      VelocityParamProps,
      ApiParamMetadata & { directTemplateValue: string }
    >({
      prefix: PARAM_PREFIX,
      getMetadata: (props) => {
        return {
          directTemplateValue: props?.template ?? '',
          forceType: 'any',
          source: 'velocity',
        };
      },
    })(props)(target, destination as string);
  };
