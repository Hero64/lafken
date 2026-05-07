import type { ApiPayloadMetadata, ApiPayloadProps } from '../request';
import type { HTTP_STATUS_CODE_NUMBER } from '../status';
import type { ResponseFieldMetadata } from './field';

export interface ResponseProps<T> extends ApiPayloadProps<T> {
  /**
   * Method responses.
   *
   * Defines the possible responses for an API method. You can specify
   * a response for each HTTP status code by either:
   * - Passing a payload (function or class) if you want to return
   *   additional information.
   * - Using `true` if no additional information is needed in the response.
   *
   * @example
   * // Define a 200 OK response with a payload
   * {
   *   responses: {
   *     200: UserResponse
   *   }
   * }
   *
   * @example
   * // Define a 204 No Content response without a payload
   * {
   *   responses: {
   *     204: true
   *   }
   * }
   */
  responses?: Partial<Record<HTTP_STATUS_CODE_NUMBER, true | Function>>;
  /**
   * Default HTTP status code.
   *
   * Specifies the default HTTP status code that will be returned
   * by the API method if no other response is explicitly provided.
   *
   * - For `GET`, `PUT`, `DELETE` methods, the default is `200 OK`.
   * - For `POST` methods, the default is `201 Created`.
   */
  defaultCode?: HTTP_STATUS_CODE_NUMBER;
  /**
   * Regex selection pattern for the success integration response in API Gateway.
   *
   * API Gateway uses this pattern to decide which integration response mapping
   * applies to a given backend reply. When omitted the response acts as the
   * default (catch-all) mapping — i.e. any reply that does not match a more
   * specific pattern is routed here.
   *
   * @example
   * selectionPattern: '2\\d{2}'
   */
  selectionPattern?: string;
}

export interface ResponseMetadata<T>
  extends ApiPayloadMetadata<T>,
    Omit<ResponseProps<T>, 'name' | 'responses'> {
  responses?: Partial<Record<string, ResponseFieldMetadata | true>>;
}
