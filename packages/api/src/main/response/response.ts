import {
  createFieldName,
  createPayloadDecorator,
  FieldProperties,
  getEventFields,
} from '@lafken/common';
import type { ApiPayloadMetadata } from '../request';
import type { HTTP_STATUS_CODE_NUMBER } from '../status';
import { RESPONSE_PREFIX, type ResponseFieldMetadata } from './field';
import type {
  ResponseMetadata,
  ResponseObjectProps,
  ResponseProps,
} from './response.types';

export const apiResponseKey = createFieldName(RESPONSE_PREFIX, FieldProperties.payload);

/**
 * Class decorator that declares a nested sub-object belonging to an
 * `@ApiResponse` payload.
 *
 * Use it to mark auxiliary classes that represent a subset of fields
 * which are then referenced as a property inside a top-level
 * `@ApiResponse` class. It registers the class with the same payload
 * metadata so its field decorators are correctly resolved during
 * response mapping.
 *
 * @param props - Optional payload configuration (e.g. a custom `name`).
 *
 * @example
 * ```ts
 * @ResponseObject()
 * export class Address {
 *   @ResField()
 *   street: string;
 *
 *   @ResField()
 *   city: string;
 * }
 *
 * @ApiResponse()
 * export class UserResponse {
 *   @ResField()
 *   name: string;
 *
 *   @ResField({ type: Address })
 *   address: Address;
 * }
 * ```
 */
export const ResponseObject =
  <T extends Function>(props?: ResponseObjectProps<T['prototype']>) =>
  (target: T) =>
    createPayloadDecorator<
      ResponseObjectProps<T['prototype']>,
      ApiPayloadMetadata<T['prototype']> & { responseTemplate?: string }
    >({
      prefix: RESPONSE_PREFIX,
      createUniqueId: true,
      getMetadata: (props) => ({
        ...props,
        additionalProperties: props?.additionalProperties ?? false,
      }),
    })(props)(target);

/**
 * Class decorator that declares a class as an API response payload.
 *
 * The decorated class defines the shape of the data returned by an API
 * handler. Use `@ResField` on its properties to describe the fields
 * included in the response body. You can also configure multiple HTTP
 * status codes with different payloads via the `responses` option.
 *
 * Once decorated, the class can be referenced in the `response` option
 * of an HTTP method decorator (e.g. `@Get`, `@Post`) so the framework
 * generates the correct API Gateway response model.
 *
 * @param props - Optional configuration (responses, defaultCode, name).
 *
 * @example
 * ```ts
 * @ApiResponse()
 * export class UserResponse {
 *   @ResField()
 *   name: string;
 *
 *   @ResField()
 *   email: string;
 * }
 *
 * @Api({ path: '/users' })
 * export class UserApi {
 *   @Get({ path: '/{id}', response: UserResponse })
 *   getUser() { return { name: 'Alice', email: 'alice@test.com' }; }
 * }
 * ```
 *
 * @example
 * ```ts
 * // Multiple status codes with different payloads
 * @ApiResponse({
 *   defaultCode: 200,
 *   responses: {
 *     201: UserResponse,
 *     204: true,
 *   },
 * })
 * export class GetUserResponse {}
 * ```
 */
export const ApiResponse =
  <T extends Function>(props?: ResponseProps<T['prototype']>) =>
  (target: T) =>
    createPayloadDecorator<
      ResponseProps<T['prototype']>,
      ResponseMetadata<T['prototype']>
    >({
      createUniqueId: true,
      prefix: RESPONSE_PREFIX,
      getMetadata: (props) => {
        if (!props?.responses) {
          return {
            allOf: props?.allOf,
            anyOf: props?.anyOf,
            description: props?.description,
            not: props?.not,
            oneOf: props?.oneOf,
            defaultCode: props?.defaultCode,
            responseTemplate: props?.responseTemplate,
            additionalProperties: props?.additionalProperties ?? false,
          };
        }

        const responses: Partial<Record<string, ResponseFieldMetadata | true>> = {};

        for (const responseCode in props?.responses) {
          const code = responseCode as unknown as HTTP_STATUS_CODE_NUMBER;
          responses[code] = true;

          if (props.responses[code] !== true) {
            responses[code] = getEventFields(
              RESPONSE_PREFIX,
              props.responses[code],
              'response'
            ) as ResponseFieldMetadata;
          }
        }

        return {
          ...props,
          responses,
          additionalProperties: props?.additionalProperties ?? false,
        };
      },
    })(props)(target);
