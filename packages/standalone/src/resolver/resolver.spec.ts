import { enableBuildEnvVariable } from '@lafken/common';
import {
  type AppModule,
  LambdaHandler,
  setupTestingStackWithModule,
} from '@lafken/resolver';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Handler, Standalone } from '../main';
import { StandaloneResolver } from './resolver';

vi.mock('@lafken/resolver', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lafken/resolver')>();

  const MockLambdaHandler = vi.fn().mockImplementation(function (this: any) {
    this.arn = 'test-function';
    this.isGlobal = vi.fn();
  });

  return {
    ...actual,
    LambdaHandler: MockLambdaHandler,
    lafkenResource: {
      ...actual.lafkenResource,
      make: () => MockLambdaHandler,
    },
    getAppContext: vi.fn().mockReturnValue({ contextCreator: 'test' }),
    Role: vi.fn().mockImplementation(function (this: any) {
      this.isGlobal = vi.fn();
    }),
  };
});

describe('standalone resolver', () => {
  enableBuildEnvVariable();

  beforeEach(() => {
    vi.mocked(LambdaHandler).mockClear();
  });

  describe('create', () => {
    it('should create a handler for each decorated method', () => {
      @Standalone()
      class TestStandalone {
        @Handler()
        myHandler() {}
      }

      const { module } = setupTestingStackWithModule();
      const resolver = new StandaloneResolver();

      expect(() =>
        resolver.create(module as unknown as AppModule, TestStandalone)
      ).not.toThrow();

      expect(LambdaHandler).toHaveBeenCalledTimes(1);
    });

    it('should create multiple handlers from one resource', () => {
      @Standalone()
      class TestStandalone {
        @Handler()
        handlerA() {}

        @Handler()
        handlerB() {}
      }

      const { module } = setupTestingStackWithModule();
      const resolver = new StandaloneResolver();

      resolver.create(module as unknown as AppModule, TestStandalone);

      expect(LambdaHandler).toHaveBeenCalledTimes(2);
    });

    it('should call LambdaHandler with correct config', () => {
      @Standalone()
      class TestStandalone {
        @Handler()
        myHandler() {}
      }

      const { module } = setupTestingStackWithModule();
      const resolver = new StandaloneResolver();

      resolver.create(module as unknown as AppModule, TestStandalone);

      expect(LambdaHandler).toHaveBeenCalledWith(
        expect.anything(),
        'myHandler-TestStandalone',
        expect.objectContaining({
          name: 'myHandler',
        })
      );
    });

    it('should use custom handler name when provided', () => {
      @Standalone()
      class TestStandalone {
        @Handler({ name: 'custom-name' })
        myHandler() {}
      }

      const { module } = setupTestingStackWithModule();
      const resolver = new StandaloneResolver();

      resolver.create(module as unknown as AppModule, TestStandalone);

      expect(LambdaHandler).toHaveBeenCalledWith(
        expect.anything(),
        'custom-name-TestStandalone',
        expect.objectContaining({
          name: 'custom-name',
        })
      );
    });

    it('should create a handler with an invoke permission', () => {
      @Standalone()
      class TestStandalone {
        @Handler({
          invoke: {
            permission: {
              principal: 'lambda.amazonaws.com',
            },
          },
        })
        myHandler() {}
      }

      const { module } = setupTestingStackWithModule();
      const resolver = new StandaloneResolver();

      expect(() =>
        resolver.create(module as unknown as AppModule, TestStandalone)
      ).not.toThrow();

      expect(LambdaHandler).toHaveBeenCalledWith(
        expect.anything(),
        'myHandler-TestStandalone',
        expect.objectContaining({
          name: 'myHandler',
        })
      );
    });
  });
});
