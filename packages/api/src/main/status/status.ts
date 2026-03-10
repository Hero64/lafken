import { HTTP_STATUS_CODE, type HTTP_STATUS_CODE_NUMBER } from './status.types';

const createHttpResponse = (message: string) => {
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
