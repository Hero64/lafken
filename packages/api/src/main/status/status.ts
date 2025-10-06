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

export const response = <T>(code: HTTP_STATUS_CODE_NUMBER, data?: T) => {
  const HTTP_RESPONSE = createHttpResponse(HTTP_STATUS_CODE[code]);
  throw new HTTP_RESPONSE(data);
};
