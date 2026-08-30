import { HTTP_STATUS_CODE, type HTTP_STATUS_CODE_NUMBER } from './status.types';

/**
 * Creates an error class that represents an HTTP error response.
 *
 * The generated class extends `Error` and serializes the status message
 * and optional data into a JSON string. The framework catches this error
 * and converts it into the final API Gateway response.
 *
 * @param message - The HTTP status phrase (e.g. `'NOT_FOUND'`, `'BAD_REQUEST'`).
 * @returns An `HttpErrorResponse` error class.
 */
export const createHttpResponse = (message: string) => {
  return class HttpErrorResponse extends Error {
    constructor(public data?: any | undefined) {
      super(
        JSON.stringify({
          res: message,
          data: data || {},
        })
      );
    }
  };
};

/**
 * Sends an HTTP response with the given status code and optional body.
 *
 * Internally throws an `HttpErrorResponse` error that the framework
 * catches and serializes into the final API Gateway response. Call it
 * from any handler method to return a specific status code.
 *
 * @typeParam T - The type of the response body.
 * @param code - The HTTP status code to return (e.g. `200`, `404`, `500`).
 * @param data - Optional response body. Defaults to an empty object if omitted.
 * @throws {HttpErrorResponse} Always throws — the framework intercepts the error.
 *
 * @example
 * ```ts
 * @Get({ path: '/{id}' })
 * getUser() {
 *   const user = findUser(id);
 *   if (!user) {
 *     response(404, { message: 'User not found' });
 *   }
 *   response(200, user);
 * }
 * ```
 */
export const response = <T>(code: HTTP_STATUS_CODE_NUMBER, data?: T) => {
  const HTTP_RESPONSE = createHttpResponse(HTTP_STATUS_CODE[code]);
  throw new HTTP_RESPONSE(data);
};
