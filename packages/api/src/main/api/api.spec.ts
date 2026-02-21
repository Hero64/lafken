import 'reflect-metadata';
import {
  enableBuildEnvVariable,
  LambdaReflectKeys,
  ResourceReflectKeys,
} from '@lafken/common';
import { beforeAll, describe, expect, it } from 'vitest';

import { Event } from '../event/event';
import { Param } from '../field/field';
import { Api, Get, Post } from './api';
import type { ApiLambdaMetadata, ApiResourceMetadata } from './api.types';

describe('API', () => {
  enableBuildEnvVariable();

  class ExampleArgument {
    @Param({
      validation: {
        required: true,
      },
      source: 'path',
    })
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
});
