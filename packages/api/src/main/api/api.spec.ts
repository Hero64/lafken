import 'reflect-metadata';
import {
  enableBuildEnvVariable,
  LambdaReflectKeys,
  ResourceReflectKeys,
} from '@lafken/common';
import { beforeAll, describe, expect, it } from 'vitest';

import { Event } from '../event/event';
import { PathParam } from '../request/param';
import { ApiResponse, ResField } from '../response';
import { Api, Get, Post } from './api';
import type { ApiLambdaMetadata, ApiResourceMetadata } from './api.types';

describe('API', () => {
  enableBuildEnvVariable();

  class ExampleArgument {
    @PathParam()
    propertyOne: string;
  }

  @Api()
  class ExampleApi {
    @Get()
    getLambda() {}

    @Post()
    postLambda() {}

    @Get()
    getLambdaWithEvent(@Event(ExampleArgument) _e: ExampleArgument) {}
  }
  describe('API Decorator', () => {
    let resource: ApiResourceMetadata;

    beforeAll(() => {
      resource = Reflect.getMetadata(ResourceReflectKeys.resource, ExampleApi);
    });

    it('should exist api resource', () => {
      expect(resource).toBeDefined();
    });

    it('should get resource params', () => {
      expect(resource.name).toBe(ExampleApi.name);
    });
  });

  describe('API Decorator method settings', () => {
    it('should capture method settings from the Api props', () => {
      @Api({
        path: '/users',
        methodSettings: {
          metricsEnabled: true,
          loggingLevel: 'info',
        },
      })
      class ExampleApiMethodSettings {
        @Get()
        getExample() {}
      }

      const resource = Reflect.getMetadata(
        ResourceReflectKeys.resource,
        ExampleApiMethodSettings
      );

      expect(resource.path).toBe('/users');
      expect(resource.methodSettings).toStrictEqual({
        metricsEnabled: true,
        loggingLevel: 'info',
      });
    });

    it('should capture stage scoped method settings from the Api props', () => {
      @Api({
        path: '/users',
        methodSettings: [{ stageName: 'prod', cachingEnabled: true }],
      })
      class ExampleApiStageMethodSettings {
        @Get()
        getExample() {}
      }

      const resource = Reflect.getMetadata(
        ResourceReflectKeys.resource,
        ExampleApiStageMethodSettings
      );

      expect(resource.methodSettings).toStrictEqual([
        { stageName: 'prod', cachingEnabled: true },
      ]);
    });
  });

  describe('METHOD decorator', () => {
    let handlers: ApiLambdaMetadata[];

    beforeAll(() => {
      handlers = Reflect.getMetadata(LambdaReflectKeys.handlers, ExampleApi.prototype);
    });

    it('should exist api handlers', () => {
      expect(handlers).toBeDefined();
    });

    it('should get handler for GET method', () => {
      const getHandler = handlers[0];

      expect(getHandler).toBeDefined();
      expect(getHandler.name).toBe('getLambda');
    });

    it('should get handler for Post method', () => {
      const getHandler = handlers[1];

      expect(getHandler).toBeDefined();
      expect(getHandler.name).toBe('postLambda');
    });

    it('should capture method settings from the method props', () => {
      @Api()
      class ExampleMethodSettingsApi {
        @Get({
          methodSettings: {
            cachingEnabled: true,
            cacheTtlInSeconds: 300,
            metricsEnabled: true,
            loggingLevel: 'info',
            throttlingRateLimit: 100,
            throttlingBurstLimit: 50,
          },
        })
        getExample() {}
      }

      const handlers = Reflect.getMetadata(
        LambdaReflectKeys.handlers,
        ExampleMethodSettingsApi.prototype
      );

      expect(handlers[0].methodSettings).toStrictEqual({
        cachingEnabled: true,
        cacheTtlInSeconds: 300,
        metricsEnabled: true,
        loggingLevel: 'info',
        throttlingRateLimit: 100,
        throttlingBurstLimit: 50,
      });
    });

    it('should capture stage scoped method settings from the method props', () => {
      @Api()
      class ExampleStageMethodSettingsApi {
        @Get({
          methodSettings: [
            {
              stageName: 'prod',
              metricsEnabled: true,
              loggingLevel: 'info',
            },
          ],
        })
        getExample() {}
      }

      const handlers = Reflect.getMetadata(
        LambdaReflectKeys.handlers,
        ExampleStageMethodSettingsApi.prototype
      );

      expect(handlers[0].methodSettings).toStrictEqual([
        {
          stageName: 'prod',
          metricsEnabled: true,
          loggingLevel: 'info',
        },
      ]);
    });
  });

  describe('EVENT decorator', () => {
    it('should exits event parameter', () => {
      const handlerProperties = Reflect.getMetadata(
        LambdaReflectKeys.arguments,
        ExampleApi.prototype
      );

      expect(handlerProperties).toBeDefined();
      expect(handlerProperties.getLambdaWithEvent).toBeDefined();
    });

    it('should get argument class', () => {
      const argumentClass = Reflect.getMetadata(
        LambdaReflectKeys.arguments,
        ExampleApi.prototype
      );

      expect(argumentClass).toBeDefined();
      expect(argumentClass.getLambdaWithEvent).toBeDefined();
    });
  });

  describe('response', () => {
    it('should response object fields', () => {
      @ApiResponse({
        defaultCode: 300,
      })
      class ExampleResponse {
        @ResField()
        foo: string;

        @ResField()
        bar: string;
      }

      @Api()
      class ExampleResponseApi {
        @Get({
          response: ExampleResponse,
        })
        getExample() {}
      }

      const handlers = Reflect.getMetadata(
        LambdaReflectKeys.handlers,
        ExampleResponseApi.prototype
      );

      expect(handlers[0].response).toBeDefined();
      expect(handlers[0].response.payload).toStrictEqual({
        additionalProperties: false,
        allOf: undefined,
        anyOf: undefined,
        defaultCode: 300,
        description: undefined,
        id: 'ExampleResponse',
        name: 'ExampleResponse',
        not: undefined,
        oneOf: undefined,
        selectionPattern: undefined,
      });
    });
    it('should accept primitive values as responses', () => {
      @Api()
      class ExampleResponseApi {
        @Get({
          response: Number,
        })
        getExample(): number {
          return 1;
        }
      }

      const handlers = Reflect.getMetadata(
        LambdaReflectKeys.handlers,
        ExampleResponseApi.prototype
      );

      expect(handlers[0].response.type).toBe('Number');
    });
  });
});
