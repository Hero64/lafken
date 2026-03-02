import { S3Bucket } from '@cdktn/provider-aws/lib/s3-bucket';
import { S3BucketAccelerateConfiguration } from '@cdktn/provider-aws/lib/s3-bucket-accelerate-configuration';
import { S3BucketAcl } from '@cdktn/provider-aws/lib/s3-bucket-acl';
import { S3BucketLifecycleConfiguration } from '@cdktn/provider-aws/lib/s3-bucket-lifecycle-configuration';
import { S3BucketNotification } from '@cdktn/provider-aws/lib/s3-bucket-notification';
import { S3BucketVersioningA } from '@cdktn/provider-aws/lib/s3-bucket-versioning';
import { enableBuildEnvVariable } from '@lafken/common';
import { type AppModule, type AppStack, setupTestingStack } from '@lafken/resolver';
import { Testing } from 'cdktn';
import { describe, expect, it, vi } from 'vitest';
import { Bucket as BucketDecorator } from '../main';
import { BucketResolver } from './resolver';

describe('bucket resolver', () => {
  enableBuildEnvVariable();

  describe('beforeCreate', () => {
    it('should create a simple bucket', async () => {
      @BucketDecorator()
      class TestBucket {}

      const { stack } = setupTestingStack();
      const resolver = new BucketResolver([TestBucket]);

      await resolver.beforeCreate(stack as unknown as AppModule);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(S3Bucket, {
        bucket: 'TestBucket',
      });
    });

    it('should create multiple buckets', async () => {
      @BucketDecorator()
      class ImagesBucket {}

      @BucketDecorator()
      class DocumentsBucket {}

      const { stack } = setupTestingStack();
      const resolver = new BucketResolver([ImagesBucket, DocumentsBucket]);

      await resolver.beforeCreate(stack as unknown as AppModule);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(S3Bucket, {
        bucket: 'ImagesBucket',
      });
      expect(synthesized).toHaveResourceWithProperties(S3Bucket, {
        bucket: 'DocumentsBucket',
      });
    });

    it('should create a bucket with custom name', async () => {
      @BucketDecorator({ name: 'my-custom-bucket' })
      class TestBucket {}

      const { stack } = setupTestingStack();
      const resolver = new BucketResolver([TestBucket]);

      await resolver.beforeCreate(stack as unknown as AppModule);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(S3Bucket, {
        bucket: 'my-custom-bucket',
      });
    });

    it('should create a bucket with eventBridge enabled', async () => {
      @BucketDecorator({ eventBridgeEnabled: true })
      class TestBucket {}

      const { stack } = setupTestingStack();
      const resolver = new BucketResolver([TestBucket]);

      await resolver.beforeCreate(stack as unknown as AppModule);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(S3Bucket, {
        bucket: 'TestBucket',
      });
      expect(synthesized).toHaveResourceWithProperties(S3BucketNotification, {
        eventbridge: true,
      });
    });

    it('should create a bucket with acl', async () => {
      @BucketDecorator({ acl: 'public-read' })
      class TestBucket {}

      const { stack } = setupTestingStack();
      const resolver = new BucketResolver([TestBucket]);

      await resolver.beforeCreate(stack as unknown as AppModule);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(S3BucketAcl, {
        acl: 'public-read',
      });
    });

    it('should create a bucket with versioning', async () => {
      @BucketDecorator({ versioned: true })
      class TestBucket {}

      const { stack } = setupTestingStack();
      const resolver = new BucketResolver([TestBucket]);

      await resolver.beforeCreate(stack as unknown as AppModule);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(S3BucketVersioningA, {
        versioning_configuration: {
          status: 'Enabled',
        },
      });
    });

    it('should create a bucket with transfer acceleration', async () => {
      @BucketDecorator({ transferAcceleration: true })
      class TestBucket {}

      const { stack } = setupTestingStack();
      const resolver = new BucketResolver([TestBucket]);

      await resolver.beforeCreate(stack as unknown as AppModule);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(S3BucketAccelerateConfiguration, {
        status: 'Enabled',
      });
    });

    it('should create a bucket with forceDestroy', async () => {
      @BucketDecorator({ forceDestroy: true })
      class TestBucket {}

      const { stack } = setupTestingStack();
      const resolver = new BucketResolver([TestBucket]);

      await resolver.beforeCreate(stack as unknown as AppModule);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(S3Bucket, {
        bucket: 'TestBucket',
        force_destroy: true,
      });
    });

    it('should create a bucket with tags', async () => {
      @BucketDecorator({ tags: { env: 'production', team: 'backend' } })
      class TestBucket {}

      const { stack } = setupTestingStack();
      const resolver = new BucketResolver([TestBucket]);

      await resolver.beforeCreate(stack as unknown as AppModule);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(S3Bucket, {
        bucket: 'TestBucket',
        tags: {
          env: 'production',
          team: 'backend',
        },
      });
    });

    it('should create a bucket with lifecycle rules', async () => {
      @BucketDecorator({
        lifeCycleRules: {
          'logs/': {
            expiration: {
              days: 90,
            },
            condition: {
              objectSizeGreaterThan: 1000,
            },
            transitions: [
              {
                days: 30,
                storage: 'glacier',
              },
            ],
          },
        },
      })
      class TestBucket {}

      const { stack } = setupTestingStack();
      const resolver = new BucketResolver([TestBucket]);

      await resolver.beforeCreate(stack as unknown as AppModule);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(S3BucketLifecycleConfiguration, {
        rule: [
          {
            expiration: [
              {
                days: 90,
              },
            ],
            filter: [
              {
                object_size_greater_than: 1000,
                prefix: 'logs/',
              },
            ],
            id: 'TestBucket-lc-rule-logs',
            status: 'Enabled',
            transition: [
              {
                days: 30,
                storage_class: 'glacier',
              },
            ],
          },
        ],
      });
    });

    it('should create a bucket with all options configured', async () => {
      @BucketDecorator({
        name: 'full-bucket',
        eventBridgeEnabled: true,
        forceDestroy: true,
        acl: 'private',
        versioned: true,
        transferAcceleration: true,
        tags: { app: 'test' },
      })
      class TestBucket {}

      const { stack } = setupTestingStack();
      const resolver = new BucketResolver([TestBucket]);

      await resolver.beforeCreate(stack as unknown as AppModule);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(S3Bucket, {
        bucket: 'full-bucket',
        force_destroy: true,
        tags: { app: 'test' },
      });
      expect(synthesized).toHaveResourceWithProperties(S3BucketNotification, {
        eventbridge: true,
      });
      expect(synthesized).toHaveResourceWithProperties(S3BucketAcl, {
        acl: 'private',
      });
      expect(synthesized).toHaveResourceWithProperties(S3BucketVersioningA, {
        versioning_configuration: {
          status: 'Enabled',
        },
      });
      expect(synthesized).toHaveResourceWithProperties(S3BucketAccelerateConfiguration, {
        status: 'Enabled',
      });
    });

    it('should apply global config to buckets', async () => {
      @BucketDecorator()
      class TestBucket {}

      const { stack } = setupTestingStack();
      const resolver = new BucketResolver([TestBucket], {
        forceDestroy: true,
        eventBridgeEnabled: true,
        versioned: true,
        acl: 'private',
        transferAcceleration: true,
        tags: { global: 'true' },
      });

      await resolver.beforeCreate(stack as unknown as AppModule);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(S3Bucket, {
        bucket: 'TestBucket',
        force_destroy: true,
        tags: { global: 'true' },
      });
      expect(synthesized).toHaveResourceWithProperties(S3BucketNotification, {
        eventbridge: true,
      });
      expect(synthesized).toHaveResourceWithProperties(S3BucketAcl, {
        acl: 'private',
      });
      expect(synthesized).toHaveResourceWithProperties(S3BucketVersioningA, {
        versioning_configuration: {
          status: 'Enabled',
        },
      });
      expect(synthesized).toHaveResourceWithProperties(S3BucketAccelerateConfiguration, {
        status: 'Enabled',
      });
    });

    it('should create a bucket with extensible resource', async () => {
      @BucketDecorator()
      class TestBucket {}

      const extendFn = vi.fn();

      const { stack } = setupTestingStack();
      const resolver = new BucketResolver([
        {
          bucket: TestBucket,
          extends: extendFn,
        },
      ]);

      await resolver.beforeCreate(stack as unknown as AppModule);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(S3Bucket, {
        bucket: 'TestBucket',
      });
    });
  });

  describe('create', () => {
    it('should throw error when create is called', () => {
      const resolver = new BucketResolver([]);

      expect(() => {
        resolver.create();
      }).toThrow('It is not possible to parse this service');
    });
  });

  describe('afterCreate', () => {
    it('should call extend callback for extensible buckets', async () => {
      @BucketDecorator()
      class TestBucket {}

      const extendFn = vi.fn();

      const { stack } = setupTestingStack();
      const resolver = new BucketResolver([
        {
          bucket: TestBucket,
          extends: extendFn,
        },
      ]);

      await resolver.beforeCreate(stack as unknown as AppModule);
      await resolver.afterCreate(stack as unknown as AppStack);

      Testing.synth(stack);

      expect(extendFn).toHaveBeenCalledTimes(1);
      expect(extendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: stack,
          bucket: expect.anything(),
        })
      );
    });

    it('should not fail when there are no extensible buckets', async () => {
      @BucketDecorator()
      class TestBucket {}

      const { stack } = setupTestingStack();
      const resolver = new BucketResolver([TestBucket]);

      await resolver.beforeCreate(stack as unknown as AppModule);
      await resolver.afterCreate(stack as unknown as AppStack);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(S3Bucket, {
        bucket: 'TestBucket',
      });
    });

    it('should call extend callback for multiple extensible buckets', async () => {
      @BucketDecorator()
      class BucketA {}

      @BucketDecorator()
      class BucketB {}

      const extendFnA = vi.fn();
      const extendFnB = vi.fn();

      const { stack } = setupTestingStack();
      const resolver = new BucketResolver([
        {
          bucket: BucketA,
          extends: extendFnA,
        },
        {
          bucket: BucketB,
          extends: extendFnB,
        },
      ]);

      await resolver.beforeCreate(stack as unknown as AppModule);
      await resolver.afterCreate(stack as unknown as AppStack);

      Testing.synth(stack);

      expect(extendFnA).toHaveBeenCalledTimes(1);
      expect(extendFnB).toHaveBeenCalledTimes(1);
    });
  });
});
