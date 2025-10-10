import type { PayloadMetadata, PayloadProps } from '@alicanto/common';

import type { ApiFieldMetadata } from '../field';
import type { HTTP_STATUS_CODE_NUMBER } from '../status';

export interface ResponseProps extends PayloadProps {
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
}

export interface ResponseMetadata
  extends PayloadMetadata,
    Omit<ResponseProps, 'name' | 'responses'> {
  responses?: Partial<Record<string, ApiFieldMetadata | true>>;
}
