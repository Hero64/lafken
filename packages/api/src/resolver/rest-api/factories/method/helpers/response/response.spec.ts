import { describe, expect, it } from 'vitest';
import { Method } from '../../../../../../main';
import { ResponseHelper } from './response';
import { defaultResponses, getSuccessStatusCode } from './response.utils';

describe('ResponseHelper', () => {
  describe('handlerResponse getter', () => {
    it('should return default responses when no response is defined', () => {
      const handler = {
        method: Method.GET,
        response: undefined,
      } as any;

      const responseHelper = new ResponseHelper(handler);
      const result = responseHelper.handlerResponse;

      expect(result).toEqual(defaultResponses(Method.GET));
      expect(result).toHaveLength(3);
      expect(result[0].statusCode).toBe('200');
      expect(result[1].statusCode).toBe('400');
      expect(result[2].statusCode).toBe('500');
    });

    it('should return cached response on subsequent calls', () => {
      const handler = {
        method: Method.GET,
        response: undefined,
      } as any;

      const responseHelper = new ResponseHelper(handler);
      const firstCall = responseHelper.handlerResponse;
      const secondCall = responseHelper.handlerResponse;

      expect(firstCall).toBe(secondCall);
    });

    it('should handle primitive response types', () => {
      const handler = {
        method: Method.GET,
        response: {
          type: 'String',
          name: 'message',
          destinationName: 'message',
        },
      } as any;

      const responseHelper = new ResponseHelper(handler);
      const result = responseHelper.handlerResponse;

      expect(result[0].field).toEqual(handler.response);
      expect(result[0].statusCode).toBe('200');
    });

    it('should handle array of primitive types', () => {
      const handler = {
        method: Method.GET,
        response: {
          type: 'Array',
          items: {
            type: 'String',
            name: 'item',
            destinationName: 'item',
          },
        },
      } as any;

      const responseHelper = new ResponseHelper(handler);
      const result = responseHelper.handlerResponse;

      expect(result[0].field).toEqual(handler.response);
      expect(result[0].statusCode).toBe('200');
    });

    it('should handle object response type with default configuration', () => {
      const handler = {
        method: Method.POST,
        response: {
          type: 'Object',
          payload: {
            defaultCode: 201,
          },
          properties: [],
        },
      } as any;

      const responseHelper = new ResponseHelper(handler);
      const result = responseHelper.handlerResponse;

      expect(result).toHaveLength(1);
      expect(result[0].statusCode).toBe('201');
      expect(result[0].field).toEqual(handler.response);
    });

    it('should handle object response type with custom responses', () => {
      const handler = {
        method: Method.POST,
        response: {
          type: 'Object',
          payload: {
            defaultCode: 201,
            responses: {
              '400': {
                type: 'String',
                name: 'error',
                destinationName: 'error',
              },
              '500': true,
            },
          },
          properties: [],
        },
      } as any;

      const responseHelper = new ResponseHelper(handler);
      const result = responseHelper.handlerResponse;

      expect(result).toHaveLength(3);

      // Default response
      expect(result[0].statusCode).toBe('201');
      expect(result[0].field).toEqual(handler.response);

      // Custom 400 response
      expect(result[1].statusCode).toBe('400');
      expect(result[1].field).toEqual(handler.response.payload.responses['400']);
      expect(result[1].template).toBeDefined();

      // Custom 500 response (true means no field)
      expect(result[2].statusCode).toBe('500');
      expect(result[2].field).toBeUndefined();
      expect(result[2].template).toBeDefined();
    });

    it('should handle array of objects response type', () => {
      const handler = {
        method: Method.GET,
        response: {
          type: 'Array',
          items: {
            type: 'Object',
            payload: {
              defaultCode: 200,
              responses: {
                '404': {
                  type: 'String',
                  name: 'notFound',
                  destinationName: 'message',
                },
              },
            },
            properties: [],
          },
        },
      } as any;

      const responseHelper = new ResponseHelper(handler);
      const result = responseHelper.handlerResponse;

      expect(result).toHaveLength(2);
      expect(result[0].statusCode).toBe('200');
      expect(result[0].field).toEqual(handler.response.items);
      expect(result[1].statusCode).toBe('404');
    });

    it('should use method-specific default status codes', () => {
      const getHandler = {
        method: Method.GET,
        response: {
          type: 'Object',
          payload: {},
          properties: [],
        },
      } as any;

      const postHandler = {
        method: Method.POST,
        response: {
          type: 'Object',
          payload: {},
          properties: [],
        },
      } as any;

      const getHelper = new ResponseHelper(getHandler);
      const postHelper = new ResponseHelper(postHandler);

      expect(getHelper.handlerResponse[0].statusCode).toBe('200');
      expect(postHelper.handlerResponse[0].statusCode).toBe('201');
    });

    it('should handle object response without payload responses', () => {
      const handler = {
        method: Method.PUT,
        response: {
          type: 'Object',
          payload: {
            defaultCode: 204,
          },
          properties: [],
        },
      } as any;

      const responseHelper = new ResponseHelper(handler);
      const result = responseHelper.handlerResponse;

      expect(result).toHaveLength(1);
      expect(result[0].statusCode).toBe('204');
      expect(result[0].field).toEqual(handler.response);
    });

    it('should handle missing defaultCode in payload', () => {
      const handler = {
        method: Method.DELETE,
        response: {
          type: 'Object',
          payload: {},
          properties: [],
        },
      } as any;

      const responseHelper = new ResponseHelper(handler);
      const result = responseHelper.handlerResponse;

      expect(result[0].statusCode).toBe(getSuccessStatusCode(Method.DELETE).toString());
    });
  });
});
