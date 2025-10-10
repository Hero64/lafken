import {
  HTTP_STATUS_CODE,
  type HTTP_STATUS_CODE_NUMBER,
  Method,
} from '../../../../../main';
import type { ResponseHandler } from './response.types';

export const defaultDataResponseTemplate = (statusName: string) => `
  #set($m = $util.parseJson($input.json("errorMessage")))
  #set($s = $m.length() - 1)
  $m.substring(${statusName.length + 17}, $s)
`;

export const createDefaultResponse = (
  code: HTTP_STATUS_CODE_NUMBER,
  includePattern = true
): ResponseHandler => {
  return {
    statusCode: code.toString(),
    selectionPattern: includePattern ? `.*${HTTP_STATUS_CODE[code]}.*` : undefined,
  };
};

export const defaultResponses = (method: Method): ResponseHandler[] => [
  {
    statusCode: getSuccessStatusCode(method).toString(),
  },
  createDefaultResponse(400),
  createDefaultResponse(500),
];

export const getSuccessStatusCode = (method: Method): HTTP_STATUS_CODE_NUMBER => {
  return method === Method.POST ? 201 : 200;
};

export const responseMessages: Record<string, string> = {
  400: 'Bad request',
  500: 'Internal server error',
};
