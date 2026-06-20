import {
  enableBuildEnvVariable,
  getResourceHandlerMetadata,
  getResourceMetadata,
} from '@lafken/common';
import { describe, expect, it } from 'vitest';
import { Handler, Standalone } from './standalone';
import { type HandlerMetadata, RESOURCE_TYPE } from './standalone.types';

describe('Standalone', () => {
  enableBuildEnvVariable();

  @Standalone()
  class MyStandalone {
    @Handler()
    myHandler() {}

    @Handler({ name: 'custom-name' })
    namedHandler() {}

    @Handler({ ref: 'myRef' })
    refHandler() {}

    @Handler({
      invoke: {
        role: {
          principal: 'apigateway.amazonaws.com',
          ref: 'myInvokeRole',
        },
      },
    })
    serviceHandler() {}
  }

  const metadata = getResourceMetadata(MyStandalone);
  const handlers = getResourceHandlerMetadata<HandlerMetadata>(MyStandalone);

  describe('@Standalone', () => {
    it('should set the resource type', () => {
      expect(metadata.type).toBe(RESOURCE_TYPE);
    });

    it('should use the class name as the resource name', () => {
      expect(metadata.originalName).toBe('MyStandalone');
    });

    it('should store filename and foldername', () => {
      expect(metadata.filename).toBeDefined();
      expect(metadata.foldername).toBeDefined();
    });
  });

  describe('@Handler', () => {
    it('should use the method name when no name is provided', () => {
      const handler = handlers.find((h) => h.name === 'myHandler');
      expect(handler).toBeDefined();
    });

    it('should use the custom name when provided', () => {
      const handler = handlers.find((h) => h.name === 'custom-name');
      expect(handler).toBeDefined();
    });

    it('should store the ref when provided', () => {
      const handler = handlers.find((h) => h.name === 'refHandler') as HandlerMetadata;
      expect(handler.ref).toBe('myRef');
    });

    it('should store the invoke config when provided', () => {
      const handler = handlers.find(
        (h) => h.name === 'serviceHandler'
      ) as HandlerMetadata;
      expect(handler.invoke).toEqual({
        role: {
          principal: 'apigateway.amazonaws.com',
          ref: 'myInvokeRole',
        },
      });
    });
  });
});
