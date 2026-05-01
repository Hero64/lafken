import {
  HTTP_STATUS_CODE,
  type HTTP_STATUS_CODE_NUMBER,
  Method,
  type ResponseFieldMetadata,
} from '../../../../../../main';
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
    field: InternalDefaultHttpResponse,
  };
};

export const getPatternResponse = (statusCode: '400' | '500'): ResponseHandler => {
  return {
    selectionPattern: `${statusCode[0]}\\d{2}`,
    statusCode,
    template: `{"message": "${responseMessages[statusCode]}"}`,
    field: InternalDefaultHttpResponse,
  };
};

export const defaultResponses = (
  method: Method,
  integration?: boolean
): ResponseHandler[] => [
  {
    statusCode: getSuccessStatusCode(method).toString(),
  },
  integration ? getPatternResponse('400') : createDefaultResponse(400),
  integration ? getPatternResponse('500') : createDefaultResponse(500),
];

export const getSuccessStatusCode = (method: Method): HTTP_STATUS_CODE_NUMBER => {
  return method === Method.POST ? 201 : 200;
};

export const responseMessages: Record<string, string> = {
  400: 'Bad request',
  500: 'Internal server error',
};

export const InternalDefaultHttpResponse: ResponseFieldMetadata = {
  type: 'Object',
  destinationName: 'InternalDefaultHttpResponse',
  name: 'InternalDefaultHttpResponse',
  payload: {
    id: 'InternalDefaultHttpResponse',
    name: 'InternalDefaultHttpResponse',
  },
  properties: [
    {
      type: 'String',
      name: 'message',
      destinationName: 'message',
      required: true,
    },
  ],
};
