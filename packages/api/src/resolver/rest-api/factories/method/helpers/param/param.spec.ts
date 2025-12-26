import { getMetadataPrototypeByKey, LambdaReflectKeys } from '@lafken/common';
import { ParamHelper } from './param';

// Mock the metadata function
jest.mock('@lafken/common', () => ({
  getMetadataPrototypeByKey: jest.fn(),
  LambdaReflectKeys: {
    event_param: 'event_param',
  },
}));

const mockGetMetadataPrototypeByKey = getMetadataPrototypeByKey as jest.MockedFunction<
  typeof getMetadataPrototypeByKey
>;

describe('ParamHelper', () => {
  let paramHelper: ParamHelper;
  const mockClassResource = class TestClass {};
  const methodName = 'testMethod';

  beforeEach(() => {
    jest.clearAllMocks();
    paramHelper = new ParamHelper(mockClassResource, methodName);
  });

  describe('params getter', () => {
    it('should return undefined when no metadata is found', () => {
      mockGetMetadataPrototypeByKey.mockReturnValue(undefined);

      const result = paramHelper.params;

      expect(result).toBeUndefined();
      expect(mockGetMetadataPrototypeByKey).toHaveBeenCalledWith(
        mockClassResource,
        LambdaReflectKeys.event_param
      );
    });

    it('should return params for specific method', () => {
      const mockParams = {
        testMethod: {
          type: 'Object',
          properties: [
            {
              type: 'String',
              name: 'id',
              destinationName: 'id',
              source: 'path',
              validation: {},
            },
          ],
        },
        otherMethod: {
          type: 'Object',
          properties: [],
        },
      };

      mockGetMetadataPrototypeByKey.mockReturnValue(mockParams);

      const result = paramHelper.params;

      expect(result).toEqual(mockParams.testMethod);
    });

    it('should cache params on subsequent calls', () => {
      const mockParams = {
        testMethod: {
          type: 'Object',
          properties: [],
        },
      };

      mockGetMetadataPrototypeByKey.mockReturnValue(mockParams);

      const firstCall = paramHelper.params;
      const secondCall = paramHelper.params;

      expect(firstCall).toBe(secondCall);
      expect(mockGetMetadataPrototypeByKey).toHaveBeenCalledTimes(1);
    });

    it('should return undefined when method not found in metadata', () => {
      const mockParams = {
        otherMethod: {
          type: 'Object',
          properties: [],
        },
      };

      mockGetMetadataPrototypeByKey.mockReturnValue(mockParams);

      const result = paramHelper.params;

      expect(result).toBeUndefined();
    });
  });

  describe('pathParams getter', () => {
    it('should return flattened field structure for simple object', () => {
      const mockParams = {
        testMethod: {
          type: 'Object',
          properties: [
            {
              type: 'String',
              name: 'id',
              destinationName: 'id',
              source: 'path',
              validation: {},
            },
            {
              type: 'String',
              name: 'name',
              destinationName: 'name',
              source: 'body',
              validation: {},
            },
          ],
        },
      };

      mockGetMetadataPrototypeByKey.mockReturnValue(mockParams);

      const result = paramHelper.pathParams;

      expect(result).toHaveProperty('');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result.id).toEqual(mockParams.testMethod.properties[0]);
      expect(result.name).toEqual(mockParams.testMethod.properties[1]);
    });

    it('should return flattened field structure for nested object', () => {
      const mockParams = {
        testMethod: {
          type: 'Object',
          properties: [
            {
              type: 'Object',
              name: 'user',
              destinationName: 'user',
              source: 'body',
              validation: {},
              properties: [
                {
                  type: 'String',
                  name: 'name',
                  destinationName: 'name',
                  source: 'body',
                  validation: {},
                },
              ],
            },
          ],
        },
      };

      mockGetMetadataPrototypeByKey.mockReturnValue(mockParams);

      const result = paramHelper.pathParams;

      expect(result).toHaveProperty('');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('user.name');
    });

    it('should handle array fields without flattening items', () => {
      const mockParams = {
        testMethod: {
          type: 'Object',
          properties: [
            {
              type: 'Array',
              name: 'tags',
              destinationName: 'tags',
              source: 'body',
              validation: {},
              items: {
                type: 'String',
                name: 'tag',
                destinationName: 'tag',
                source: 'body',
                validation: {},
              },
            },
          ],
        },
      };

      mockGetMetadataPrototypeByKey.mockReturnValue(mockParams);

      const result = paramHelper.pathParams;

      expect(result).toHaveProperty('');
      expect(result).toHaveProperty('tags');
      expect(result).not.toHaveProperty('tags.tag');
    });

    it('should cache pathParams on subsequent calls', () => {
      const mockParams = {
        testMethod: {
          type: 'Object',
          properties: [],
        },
      };

      mockGetMetadataPrototypeByKey.mockReturnValue(mockParams);

      const firstCall = paramHelper.pathParams;
      const secondCall = paramHelper.pathParams;

      expect(firstCall).toBe(secondCall);
    });
  });

  describe('paramsBySource getter', () => {
    it('should group parameters by source', () => {
      const mockParams = {
        testMethod: {
          type: 'Object',
          properties: [
            {
              type: 'String',
              name: 'id',
              destinationName: 'id',
              source: 'path',
              validation: {},
            },
            {
              type: 'String',
              name: 'filter',
              destinationName: 'filter',
              source: 'query',
              validation: {},
            },
            {
              type: 'String',
              name: 'name',
              destinationName: 'name',
              source: 'body',
              validation: {},
            },
            {
              type: 'String',
              name: 'authorization',
              destinationName: 'authorization',
              source: 'header',
              validation: {},
            },
          ],
        },
      };

      mockGetMetadataPrototypeByKey.mockReturnValue(mockParams);

      // Verify that params getter works first
      expect(paramHelper.params).toEqual(mockParams.testMethod);

      const result = paramHelper.paramsBySource;

      expect(result.path).toBeDefined();
      expect(result.path).toHaveLength(1);
      expect(result.path?.[0]).toEqual(mockParams.testMethod.properties[0]);

      expect(result.query).toBeDefined();
      expect(result.query).toHaveLength(1);
      expect(result.query?.[0]).toEqual(mockParams.testMethod.properties[1]);

      expect(result.body).toBeDefined();
      expect(result.body).toHaveLength(1);
      expect(result.body?.[0]).toEqual(mockParams.testMethod.properties[2]);

      expect(result.header).toBeDefined();
      expect(result.header).toHaveLength(1);
      expect(result.header?.[0]).toEqual(mockParams.testMethod.properties[3]);
    });

    it('should default to query source when source is not specified', () => {
      const mockParams = {
        testMethod: {
          type: 'Object',
          properties: [
            {
              type: 'String',
              name: 'param1',
              destinationName: 'param1',
              validation: {},
            },
            {
              type: 'String',
              name: 'param2',
              destinationName: 'param2',
              validation: {},
            },
          ],
        },
      };

      mockGetMetadataPrototypeByKey.mockReturnValue(mockParams);

      const result = paramHelper.paramsBySource;

      expect(result.query).toHaveLength(2);
      expect(result.query).toEqual(mockParams.testMethod.properties);
    });

    it('should handle multiple parameters with same source', () => {
      const mockParams = {
        testMethod: {
          type: 'Object',
          properties: [
            {
              type: 'String',
              name: 'param1',
              destinationName: 'param1',
              source: 'query',
              validation: {},
            },
            {
              type: 'String',
              name: 'param2',
              destinationName: 'param2',
              source: 'query',
              validation: {},
            },
            {
              type: 'String',
              name: 'param3',
              destinationName: 'param3',
              source: 'body',
              validation: {},
            },
          ],
        },
      };

      mockGetMetadataPrototypeByKey.mockReturnValue(mockParams);

      const result = paramHelper.paramsBySource;

      expect(result.query).toHaveLength(2);
      expect(result.body).toHaveLength(1);
    });

    it('should cache paramsBySource on subsequent calls', () => {
      const mockParams = {
        testMethod: {
          type: 'Object',
          properties: [],
        },
      };

      mockGetMetadataPrototypeByKey.mockReturnValue(mockParams);

      const firstCall = paramHelper.paramsBySource;
      const secondCall = paramHelper.paramsBySource;

      expect(firstCall).toBe(secondCall);
    });

    it('should handle empty properties array', () => {
      const mockParams = {
        testMethod: {
          type: 'Object',
          properties: [],
        },
      };

      mockGetMetadataPrototypeByKey.mockReturnValue(mockParams);

      const result = paramHelper.paramsBySource;

      expect(result).toEqual({});
    });
  });

  describe('validate path params', () => {
    it('should throw error in non resolver param in path', () => {
      const mockParams = {
        testMethod: {
          type: 'Object',
          properties: [
            {
              type: 'String',
              name: 'name',
              source: 'path',
              validation: {},
            },
          ],
        },
      };

      mockGetMetadataPrototypeByKey.mockReturnValue(mockParams);
      expect(() => {
        paramHelper.validateParamsInPath('/');
      }).toThrow();
    });

    it('should throw error with extra parameters', () => {
      const mockParams = {
        testMethod: {
          type: 'Object',
          properties: [
            {
              type: 'String',
              name: 'name',
              source: 'path',
              validation: {},
            },
          ],
        },
      };

      mockGetMetadataPrototypeByKey.mockReturnValue(mockParams);
      expect(() => {
        paramHelper.validateParamsInPath('/{name}/{lastName+}');
      }).toThrow();
    });
  });
});
