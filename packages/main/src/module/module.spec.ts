import { S3Bucket } from '@cdktn/provider-aws/lib/s3-bucket';
import {
  createLambdaDecorator,
  createResourceDecorator,
  enableBuildEnvVariable,
} from '@lafken/common';
import {
  type AppModule,
  ContextName,
  lafkenResource,
  type ResolverType,
  Role,
  setupTestingStack,
} from '@lafken/resolver';
import { Testing } from 'cdktn';
import { describe, expect, it, vi } from 'vitest';
import { createModule, StackModule } from './module';

describe('Module', () => {
  enableBuildEnvVariable();

  const TestingResource = createResourceDecorator({
    type: 'test-resolver',
  });
  const TestHandler = createLambdaDecorator({
    getLambdaMetadata: (props) => props,
  });
  @TestingResource()
  class TestResource {
    @TestHandler()
    handler() {}
  }
  it('should initialize module', async () => {
    const { stack } = setupTestingStack();
    const module = createModule({
      name: 'testing-module',
      resources: [],
    });

    expect(await module(stack, {})).toBeInstanceOf(StackModule);
  });

  it('should create context', async () => {
    const { stack } = setupTestingStack();
    const module = createModule({
      name: 'testing-module',
      resources: [],
      globalConfig: {
        lambda: {
          memory: 100,
          runtime: 20,
          timeout: 30,
        },
      },
    });

    const stackModule = await module(stack, {});

    expect(stackModule.node.tryGetContext(ContextName.module)).toStrictEqual({
      contextCreator: 'testing-module',
      memory: 100,
      runtime: 20,
      timeout: 30,
    });
  });

  it('should create a global lambda role', async () => {
    const { stack } = setupTestingStack();
    const module = createModule({
      name: 'testing-module',
      resources: [],
      globalConfig: {
        lambda: {
          services: ['dynamodb', 's3'],
        },
      },
    });

    await module(stack, {});
    const role = lafkenResource.getResource<Role>('module', 'testing-module-module-role');

    expect(role).toBeDefined();
    expect(role).toBeInstanceOf(Role);
  });

  it('should process module resource', async () => {
    const createMock = vi.fn();
    class TestResolver implements ResolverType {
      type: string = 'test-resolver';
      create = createMock;
    }

    const { stack } = setupTestingStack();
    const module = createModule({
      name: 'testing-module',
      resources: [TestResource],
    });

    const stackModule = await module(stack, {
      'test-resolver': new TestResolver(),
    });

    expect(createMock).toHaveBeenCalledWith(stackModule, TestResource);
  });

  it('should add tags in children resources', async () => {
    class TestResolver implements ResolverType {
      type: string = 'test-resolver';
      public async create(module: AppModule) {
        new S3Bucket(module, 'testing-bucket');
      }
    }

    const { stack } = setupTestingStack();
    const module = createModule({
      name: 'testing-module',
      resources: [TestResource],
      globalConfig: {
        tags: {
          foo: 'bar',
        },
      },
    });

    await module(stack, {
      'test-resolver': new TestResolver(),
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(S3Bucket, {
      tags: {
        'lafken:module': 'testing-module',
        foo: 'bar',
      },
    });
  });
});
