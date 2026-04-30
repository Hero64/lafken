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
   * Apache Velocity Template Language (VTL) expression used as the
   * `responseTemplates['application/json']` value in the API Gateway
   * integration response for the success status code.
   *
   * When omitted, API Gateway uses the default pass-through behaviour
   * (i.e. the raw backend response body is forwarded unchanged).
   *
   * @example
   * // Forward the entire response body as-is
   * responseTemplate: "$input.json('$')"
   *
   * @example
   * // Extract a nested field
   * responseTemplate: "$input.json('$.body')"
   */
  responseTemplate?: string;
}

export interface ResponseObjectProps<T> extends ApiPayloadProps<T> {
  /**
   * Apache Velocity Template Language (VTL) expression used as the
   * `responseTemplates['application/json']` value in the API Gateway
   * integration response for the success status code.
   *
   * When omitted, API Gateway uses the default pass-through behaviour.
   *
   * @example
   * responseTemplate: "$input.json('$')"
   */
  responseTemplate?: string;
}

export interface ResponseMetadata<T>
  extends ApiPayloadMetadata<T>,
    Omit<ResponseProps<T>, 'name' | 'responses'> {
  responses?: Partial<Record<string, ResponseFieldMetadata | true>>;
}
