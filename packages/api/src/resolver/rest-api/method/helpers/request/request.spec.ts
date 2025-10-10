import { RequestHelper } from './request';

describe('RequestHelper', () => {
  let requestHelper: RequestHelper;
  let mockParamHelper: any;

  beforeEach(() => {
    mockParamHelper = {
      paramsBySource: {},
    };

    requestHelper = new RequestHelper(mockParamHelper);
  });

  describe('getRequestParameters', () => {
    it('should return undefined when no parameters exist', () => {
      mockParamHelper.paramsBySource = {};

      const result = requestHelper.getRequestParameters();

      expect(result).toBeUndefined();
    });

    it('should map query parameters correctly', () => {
      mockParamHelper.paramsBySource = {
        query: [
          {
            type: 'String',
            name: 'filter',
            destinationName: 'filter',
            validation: { required: true },
          },
          {
            type: 'String',
            name: 'sort',
            destinationName: 'sort',
            validation: { required: false },
          },
        ],
      };

      const result = requestHelper.getRequestParameters();

      expect(result).toEqual({
        'method.request.querystring.filter': true,
        'method.request.querystring.sort': false,
      });
    });

    it('should map path parameters correctly', () => {
      mockParamHelper.paramsBySource = {
        path: [
          {
            type: 'String',
            name: 'id',
            destinationName: 'id',
            validation: { required: true },
          },
          {
            type: 'String',
            name: 'userId',
            destinationName: 'userId',
            validation: {},
          },
        ],
      };

      const result = requestHelper.getRequestParameters();

      expect(result).toEqual({
        'method.request.path.id': true,
        'method.request.path.userId': true,
      });
    });

    it('should map header parameters correctly', () => {
      mockParamHelper.paramsBySource = {
        header: [
          {
            type: 'String',
            name: 'authorization',
            destinationName: 'authorization',
            validation: { required: true },
          },
          {
            type: 'String',
            name: 'content-type',
            destinationName: 'contentType',
            validation: { required: false },
          },
        ],
      };

      const result = requestHelper.getRequestParameters();

      expect(result).toEqual({
        'method.request.header.authorization': true,
        'method.request.header.content-type': false,
      });
    });

    it('should combine all parameter types', () => {
      mockParamHelper.paramsBySource = {
        query: [
          {
            type: 'String',
            name: 'filter',
            destinationName: 'filter',
            validation: { required: true },
          },
        ],
        path: [
          {
            type: 'String',
            name: 'id',
            destinationName: 'id',
            validation: { required: true },
          },
        ],
        header: [
          {
            type: 'String',
            name: 'authorization',
            destinationName: 'authorization',
            validation: { required: false },
          },
        ],
      };

      const result = requestHelper.getRequestParameters();

      expect(result).toEqual({
        'method.request.querystring.filter': true,
        'method.request.path.id': true,
        'method.request.header.authorization': false,
      });
    });

    it('should default to required true when validation.required is undefined', () => {
      mockParamHelper.paramsBySource = {
        query: [
          {
            type: 'String',
            name: 'param',
            destinationName: 'param',
            validation: {},
          },
        ],
      };

      const result = requestHelper.getRequestParameters();

      expect(result).toEqual({
        'method.request.querystring.param': true,
      });
    });

    it('should handle empty parameter arrays', () => {
      mockParamHelper.paramsBySource = {
        query: [],
        path: [],
        header: [],
      };

      const result = requestHelper.getRequestParameters();

      expect(result).toBeUndefined();
    });
  });

  describe('generateMethodRequestType', () => {
    it('should generate correct method request type for querystring', () => {
      const result = requestHelper.generateMethodRequestType('querystring', 'filter');

      expect(result).toBe('method.request.querystring.filter');
    });

    it('should generate correct method request type for path', () => {
      const result = requestHelper.generateMethodRequestType('path', 'id');

      expect(result).toBe('method.request.path.id');
    });

    it('should generate correct method request type for header', () => {
      const result = requestHelper.generateMethodRequestType('header', 'authorization');

      expect(result).toBe('method.request.header.authorization');
    });
  });

  describe('getValidatorProperties', () => {
    it('should return false for both validators when no parameters exist', () => {
      mockParamHelper.paramsBySource = {};

      const result = requestHelper.getValidatorProperties();

      expect(result).toEqual({
        validateRequestParameters: false,
        validateRequestBody: false,
      });
    });

    it('should return true for validateRequestParameters when query params exist', () => {
      mockParamHelper.paramsBySource = {
        query: [
          {
            type: 'String',
            name: 'filter',
            destinationName: 'filter',
            validation: {},
          },
        ],
      };

      const result = requestHelper.getValidatorProperties();

      expect(result.validateRequestParameters).toBe(true);
      expect(result.validateRequestBody).toBe(false);
    });

    it('should return true for validateRequestParameters when path params exist', () => {
      mockParamHelper.paramsBySource = {
        path: [
          {
            type: 'String',
            name: 'id',
            destinationName: 'id',
            validation: {},
          },
        ],
      };

      const result = requestHelper.getValidatorProperties();

      expect(result.validateRequestParameters).toBe(true);
      expect(result.validateRequestBody).toBe(false);
    });

    it('should return true for validateRequestBody when required body params exist', () => {
      mockParamHelper.paramsBySource = {
        body: [
          {
            type: 'String',
            name: 'name',
            destinationName: 'name',
            validation: { required: true },
          },
          {
            type: 'String',
            name: 'description',
            destinationName: 'description',
            validation: { required: false },
          },
        ],
      };

      const result = requestHelper.getValidatorProperties();

      expect(result.validateRequestParameters).toBe(false);
      expect(result.validateRequestBody).toBe(true);
    });

    it('should return false for validateRequestBody when no required body params exist', () => {
      mockParamHelper.paramsBySource = {
        body: [
          {
            type: 'String',
            name: 'name',
            destinationName: 'name',
            validation: { required: false },
          },
          {
            type: 'String',
            name: 'description',
            destinationName: 'description',
            validation: {},
          },
        ],
      };

      const result = requestHelper.getValidatorProperties();

      expect(result.validateRequestParameters).toBe(false);
      expect(result.validateRequestBody).toBe(false);
    });

    it('should return correct values for mixed parameter scenarios', () => {
      mockParamHelper.paramsBySource = {
        query: [
          {
            type: 'String',
            name: 'filter',
            destinationName: 'filter',
            validation: {},
          },
        ],
        body: [
          {
            type: 'String',
            name: 'name',
            destinationName: 'name',
            validation: { required: true },
          },
        ],
      };

      const result = requestHelper.getValidatorProperties();

      expect(result.validateRequestParameters).toBe(true);
      expect(result.validateRequestBody).toBe(true);
    });

    it('should handle undefined body parameters', () => {
      mockParamHelper.paramsBySource = {
        query: [
          {
            type: 'String',
            name: 'filter',
            destinationName: 'filter',
            validation: {},
          },
        ],
        body: undefined,
      };

      const result = requestHelper.getValidatorProperties();

      expect(result.validateRequestParameters).toBe(true);
      expect(result.validateRequestBody).toBe(false);
    });
  });
});
