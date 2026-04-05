import { createFieldName, createPayloadDecorator, FieldProperties } from '@lafken/common';
import { PARAM_PREFIX } from './param';
import type { ApiPayloadMetadata, ApiPayloadProps } from './param/param.types';

export const apiRequestKey = createFieldName(PARAM_PREFIX, FieldProperties.payload);

/**
 * Class decorator that declares a class as an API request payload.
 *
 * The decorated class defines the shape of the data expected by an API
 * handler. Use field decorators such as `@BodyParam`, `@QueryParam`,
 * `@PathParam`, or `@HeaderParam` on its properties to describe where
 * each value is extracted from in the incoming HTTP request.
 *
 * Once decorated, the class can be passed to `@Event()` on a handler
 * method parameter so the framework maps the raw API Gateway event
 * into the typed object automatically.
 *
 * @param props - Optional payload configuration (e.g. a custom `name`).
 *
 * @example
 * ```ts
 * @ApiRequest()
 * export class CreateUserPayload {
 *   @BodyParam({ minLength: 1 })
 *   name: string;
 *
 *   @BodyParam({ min: 0 })
 *   age: number;
 * }
 *
 * @Api({ path: '/users' })
 * export class UserApi {
 *   @Post()
 *   create(@Event(CreateUserPayload) req: CreateUserPayload) {}
 * }
 * ```
 */
export const ApiRequest =
  <T extends Function>(props?: ApiPayloadProps<T['prototype']>) =>
  (target: T) =>
    createPayloadDecorator<
      ApiPayloadProps<T['prototype']>,
      ApiPayloadMetadata<T['prototype']>
    >({
      prefix: PARAM_PREFIX,
      createUniqueId: true,
      getMetadata: (props) => ({
        ...props,
        additionalProperties: props?.additionalProperties ?? false,
      }),
    })(props)(target);

/**
 * Class decorator that declares a nested sub-object belonging to an
 * `@ApiRequest` payload.
 *
 * Use it to mark auxiliary classes that represent a subset of fields
 * which are then referenced as a property inside a top-level
 * `@ApiRequest` class. It registers the class with the same payload
 * metadata so its field decorators are correctly resolved during
 * request mapping.
 *
 * Functionally identical to `@ApiRequest`; the separate alias exists
 * to make the relationship between the parent payload and its nested
 * objects explicit in your code.
 *
 * @param props - Optional payload configuration (e.g. a custom `name`).
 *
 * @example
 * ```ts
 * @RequestObject()
 * export class Address {
 *   @BodyParam()
 *   street: string;
 *
 *   @BodyParam()
 *   city: string;
 * }
 *
 * @ApiRequest()
 * export class CreateUserPayload {
 *   @BodyParam({ minLength: 1 })
 *   name: string;
 *
 *   @BodyParam({ type: Address })
 *   address: Address;
 * }
 * ```
 */
export const RequestObject = ApiRequest;
