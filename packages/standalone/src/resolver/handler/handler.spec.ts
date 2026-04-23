import {
  enableBuildEnvVariable,
  getResourceHandlerMetadata,
  getResourceMetadata,
  type ResourceMetadata,
} from '@lafken/common';
import { LambdaHandler, Role, setupTestingStackWithModule } from '@lafken/resolver';
import { describe, expect, it, vi } from 'vitest';
import {
  Handler as HandlerDecorator,
  type HandlerMetadata,
  Standalone,
} from '../../main';
import { Handler } from './handler';

vi.mock('@lafken/resolver', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lafken/resolver')>();

  const MockLambdaHandler = vi.fn().mockImplementation(function (this: any) {
    this.arn = 'test-function';
    this.isGlobal = vi.fn();
    this.node = { tryGetContext: vi.fn() };
  });

  return {
    ...actual,
    LambdaHandler: MockLambdaHandler,
    lafkenResource: {
      ...actual.lafkenResource,
      make: () => MockLambdaHandler,
    },
    getAppContext: vi.fn().mockReturnValue({ contextCreator: 'test-app' }),
    Role: vi.fn().mockImplementation(function (this: any) {
      this.isGlobal = vi.fn();
    }),
  };
});

describe('Handler', () => {
  enableBuildEnvVariable();

  @Standalone()
  class TestStandalone {
    @HandlerDecorator()
    myHandler() {}

    @HandlerDecorator({ name: 'custom-name' })
    namedHandler() {}

    @HandlerDecorator({ invocatorService: 'lambda.amazonaws.com' })
    serviceHandler() {}
  }

  const metadata: ResourceMetadata = getResourceMetadata(TestStandalone);
  const handlers = getResourceHandlerMetadata<HandlerMetadata>(TestStandalone);

  const myHandlerMeta = handlers.find((h) => h.name === 'myHandler') as HandlerMetadata;
  const customNameMeta = handlers.find(
    (h) => h.name === 'custom-name'
  ) as HandlerMetadata;
  const serviceHandlerMeta = handlers.find(
    (h) => h.name === 'serviceHandler'
  ) as HandlerMetadata;

  it('should call LambdaHandler with the correct config', () => {
    const { module } = setupTestingStackWithModule();

    new Handler(module, 'myHandler-TestStandalone', {
      handlerMetadata: myHandlerMeta,
      resourceMetadata: metadata,
    });

    expect(LambdaHandler).toHaveBeenCalledWith(
      expect.anything(),
      'myHandler-TestStandalone',
      expect.objectContaining({
        filename: metadata.filename,
        foldername: metadata.foldername,
        name: 'myHandler',
        originalName: metadata.originalName,
      })
    );
  });

  it('should register itself globally', () => {
    const { module } = setupTestingStackWithModule();

    const handler = new Handler(module, 'myHandler-TestStandalone', {
      handlerMetadata: myHandlerMeta,
      resourceMetadata: metadata,
    });

    expect(handler.isGlobal).toHaveBeenCalledWith(module.id, 'handler::myHandler');
  });

  it('should use custom handler name when provided', () => {
    const { module } = setupTestingStackWithModule();

    new Handler(module, 'custom-name-TestStandalone', {
      handlerMetadata: customNameMeta,
      resourceMetadata: metadata,
    });

    expect(LambdaHandler).toHaveBeenCalledWith(
      expect.anything(),
      'custom-name-TestStandalone',
      expect.objectContaining({
        name: 'custom-name',
      })
    );
  });

  it('should not create a role when invocatorService is not provided', () => {
    const { module } = setupTestingStackWithModule();

    new Handler(module, 'myHandler-TestStandalone', {
      handlerMetadata: myHandlerMeta,
      resourceMetadata: metadata,
    });

    expect(Role).not.toHaveBeenCalled();
  });

  it('should create an invoke role when invocatorService is provided', () => {
    const { module } = setupTestingStackWithModule();

    new Handler(module, 'serviceHandler-TestStandalone', {
      handlerMetadata: serviceHandlerMeta,
      resourceMetadata: metadata,
    });

    expect(Role).toHaveBeenCalledWith(
      expect.anything(),
      'handler-role',
      expect.objectContaining({
        principal: 'lambda.amazonaws.com',
        services: expect.arrayContaining([
          expect.objectContaining({
            type: 'lambda',
            permissions: ['InvokeFunction'],
          }),
        ]),
      })
    );
  });

  it('should register the invoke role globally', () => {
    const { module } = setupTestingStackWithModule();

    new Handler(module, 'serviceHandler-TestStandalone', {
      handlerMetadata: serviceHandlerMeta,
      resourceMetadata: metadata,
    });

    const roleInstance = vi.mocked(Role).mock.results[0].value;
    expect(roleInstance.isGlobal).toHaveBeenCalledWith(
      module.id,
      'handler::role::serviceHandler'
    );
  });

  it('should include the contextCreator in the role name', () => {
    const { module } = setupTestingStackWithModule();

    new Handler(module, 'serviceHandler-TestStandalone', {
      handlerMetadata: serviceHandlerMeta,
      resourceMetadata: metadata,
    });

    expect(Role).toHaveBeenCalledWith(
      expect.anything(),
      'handler-role',
      expect.objectContaining({
        name: 'test-app-servicehandler-teststandalone-invoke-role',
      })
    );
  });
});
