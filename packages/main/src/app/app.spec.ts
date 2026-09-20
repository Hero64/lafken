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
          runtime: 24,
        },
      },
    });

    expect(appStack.node.tryGetContext(ContextName.app)).toStrictEqual({
      contextCreator: 'testing',
      enableTrace: true,
      memory: 2000,
      runtime: 24,
      bundler: undefined,
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

  it('should skip global role creation when services is an empty array', async () => {
    await createApp({
      name: 'testing-skip-role',
      modules: [],
      resolvers: [],
      globalConfig: {
        lambda: {
          services: [],
        },
      },
    });
    const role = lafkenResource.getResource<Role | undefined>(
      'app',
      'testing-skip-role-global-role'
    );

    expect(role).toBeUndefined();
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

  it('should create S3Backend when state type is s3', async () => {
    const { appStack } = await createApp({
      name: 'testing',
      modules: [],
      resolvers: [],
      state: {
        type: 's3',
        bucket: 'my-terraform-state',
        key: 'testing/terraform.tfstate',
        region: 'us-east-1',
      },
    });

    const terraform = appStack.toTerraform();

    expect(terraform.terraform.backend.s3).toEqual({
      bucket: 'my-terraform-state',
      key: 'testing/terraform.tfstate',
      region: 'us-east-1',
    });
  });

  it('should create LocalBackend when state type is local', async () => {
    const { appStack } = await createApp({
      name: 'testing',
      modules: [],
      resolvers: [],
      state: {
        type: 'local',
        path: './terraform.testing.tfstate',
      },
    });

    const terraform = appStack.toTerraform();

    expect(terraform.terraform.backend.local).toEqual({
      path: './terraform.testing.tfstate',
    });
  });

  it('should fall back to the cdktn default local backend when state is not provided', async () => {
    const { appStack } = await createApp({
      name: 'testing',
      modules: [],
      resolvers: [],
    });

    const terraform = appStack.toTerraform();

    expect(terraform.terraform.backend.s3).toBeUndefined();
    expect(terraform.terraform.backend.local.path).toContain('terraform.testing.tfstate');
  });
});
