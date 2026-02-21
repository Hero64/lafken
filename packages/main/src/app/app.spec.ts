import { rm } from 'node:fs/promises';
import { join } from 'node:path';
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
} from '@lafken/resolver';
import { App, Testing } from 'cdktn';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { createModule } from '../module';
import { AppStack, createApp } from './app';

describe('App', () => {
  enableBuildEnvVariable();

  afterAll(async () => {
    await rm(join(__dirname, '../..', 'cdktf.out'), {
      recursive: true,
      force: true,
    });
  });

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
  it('should create application', async () => {
    const { app, appStack } = await createApp({
      name: 'testing',
      modules: [],
      resolvers: [],
    });

    expect(app).toBeInstanceOf(App);
    expect(appStack).toBeInstanceOf(AppStack);
  });

  it('should create context', async () => {
    const { appStack } = await createApp({
      name: 'testing',
      modules: [],
      resolvers: [],
      globalConfig: {
        lambda: {
          enableTrace: true,
          memory: 2000,
          runtime: 20,
        },
      },
    });

    expect(appStack.node.tryGetContext(ContextName.app)).toStrictEqual({
      contextCreator: 'testing',
      enableTrace: true,
      memory: 2000,
      runtime: 20,
    });
  });

  it('should create a global lambda role', async () => {
    await createApp({
      name: 'testing',
      modules: [],
      resolvers: [],
      globalConfig: {
        lambda: {
          services: ['s3', 'sqs'],
        },
      },
    });
    const role = lafkenResource.getResource<Role>('app', 'testing-global-role');

    expect(role).toBeDefined();
    expect(role).toBeInstanceOf(Role);
  });

  it('should process module resources', async () => {
    const createMock = vi.fn();
    class TestResolver implements ResolverType {
      type: string = 'test-resolver';
      create = createMock;
    }
    await createApp({
      name: 'testing',
      modules: [
        createModule({
          name: 'testing',
          resources: [TestResource],
        }),
      ],
      resolvers: [new TestResolver()],
    });

    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('should trigger resolver hooks', async () => {
    const createMock = vi.fn();
    const callOrder: string[] = [];
    const beforeCreateMock = vi.fn().mockImplementation(() => {
      callOrder.push('before');
    });
    const afterCreateMock = vi.fn().mockImplementation(() => {
      callOrder.push('after');
    });

    class TestResolver implements ResolverType {
      type: string = 'test-resolver';
      create = createMock;
      beforeCreate = beforeCreateMock;
      afterCreate = afterCreateMock;
    }
    const { appStack } = await createApp({
      name: 'testing',
      modules: [
        createModule({
          name: 'testing',
          resources: [TestResource],
        }),
      ],
      resolvers: [new TestResolver()],
    });

    expect(beforeCreateMock).toHaveBeenCalledWith(appStack);
    expect(afterCreateMock).toHaveBeenCalledWith(appStack);
    expect(callOrder).toStrictEqual(['before', 'after']);
  });

  it('should resolver dependencies after complete create resources', async () => {
    const dependentCallback = vi.fn();
    class TestResolver implements ResolverType {
      type: string = 'test-resolver';
      async create(scope: AppModule) {
        const Bucket = lafkenResource.make(S3Bucket);
        const bucket = new Bucket(scope, 'bucket');
        bucket.isDependent(dependentCallback);
      }
    }
    await createApp({
      name: 'testing',
      modules: [
        createModule({
          name: 'testing',
          resources: [TestResource],
        }),
      ],
      resolvers: [new TestResolver()],
    });

    expect(dependentCallback).toHaveBeenCalledTimes(1);
  });

  it('should add tags in children resources', async () => {
    class TestResolver implements ResolverType {
      type: string = 'test-resolver';
      public async create(module: AppModule) {
        new S3Bucket(module, 'testing-bucket');
      }
    }

    const { appStack } = await createApp({
      name: 'testing',
      modules: [
        createModule({
          name: 'testing',
          resources: [TestResource],
        }),
      ],
      resolvers: [new TestResolver()],
      globalConfig: {
        tags: {
          foo: 'bar',
        },
      },
    });

    const synthesized = Testing.synth(appStack);

    expect(synthesized).toHaveResourceWithProperties(S3Bucket, {
      tags: {
        'lafken:app': 'testing',
        'lafken:module': 'testing',
        foo: 'bar',
      },
    });
  });
  it('should call extend callback', async () => {
    const extendCallback = vi.fn();
    const { appStack } = await createApp({
      name: 'testing',
      modules: [],
      resolvers: [],
      extend: extendCallback,
    });

    expect(extendCallback).toHaveBeenCalledWith(appStack);
  });
});
