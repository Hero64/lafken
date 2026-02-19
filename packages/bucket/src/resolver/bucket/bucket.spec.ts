import { S3Bucket } from '@cdktn/provider-aws/lib/s3-bucket';
import { S3BucketAccelerateConfiguration } from '@cdktn/provider-aws/lib/s3-bucket-accelerate-configuration';
import { S3BucketAcl } from '@cdktn/provider-aws/lib/s3-bucket-acl';
import { S3BucketLifecycleConfiguration } from '@cdktn/provider-aws/lib/s3-bucket-lifecycle-configuration';
import { S3BucketNotification } from '@cdktn/provider-aws/lib/s3-bucket-notification';
import { S3BucketVersioningA } from '@cdktn/provider-aws/lib/s3-bucket-versioning';
import { enableBuildEnvVariable } from '@lafken/common';
import { setupTestingStack } from '@lafken/resolver';
import { Testing } from 'cdktn';
import { describe, expect, it } from 'vitest';
import { Bucket as BucketDecorator } from '../../main';
import { Bucket } from './bucket';

describe('Bucket', () => {
  enableBuildEnvVariable();
  it('should create a simple bucket', () => {
    @BucketDecorator()
    class TestBucket {}

    const { stack } = setupTestingStack();
    new Bucket(stack, {
      classResource: TestBucket,
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(S3Bucket, {
      bucket: 'TestBucket',
    });
  });

  it('should create a bucket with custom options', () => {
    @BucketDecorator({
      name: 'testing-bucket',
      eventBridgeEnabled: true,
      forceDestroy: true,
      acl: 'public-read',
      versioned: true,
      transferAcceleration: true,
      lifeCycleRules: {
        'foo/bar': {
          expiration: {
            days: 200,
          },
          condition: {
            objectSizeGreaterThan: 1000,
          },
          transitions: [
            {
              days: 30,
              storage: 'intelligent_tiering',
            },
          ],
        },
      },
      tags: {
        foo: 'bar',
      },
    })
    class TestBucketWithConfig {}

    const { stack } = setupTestingStack();
    new Bucket(stack, {
      classResource: TestBucketWithConfig,
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(S3Bucket, {
      bucket: 'testing-bucket',
      force_destroy: true,
      tags: {
        foo: 'bar',
      },
    });

    expect(synthesized).toHaveResourceWithProperties(S3BucketNotification, {
      eventbridge: true,
    });

    expect(synthesized).toHaveResourceWithProperties(S3BucketAcl, {
      acl: 'public-read',
    });

    expect(synthesized).toHaveResourceWithProperties(S3BucketVersioningA, {
      versioning_configuration: {
        status: 'Enabled',
      },
    });
    expect(synthesized).toHaveResourceWithProperties(S3BucketAccelerateConfiguration, {
      status: 'Enabled',
    });

    expect(synthesized).toHaveResourceWithProperties(S3BucketLifecycleConfiguration, {
      rule: [
        {
          expiration: [
            {
              days: 200,
            },
          ],
          filter: [
            {
              object_size_greater_than: 1000,
              prefix: 'foo/bar',
            },
          ],
          id: 'testing-bucket-lc-rule-foobar',
          status: 'Enabled',
          transition: [
            {
              days: 30,
              storage_class: 'intelligent_tiering',
            },
          ],
        },
      ],
    });
  });

  it('should create bucket with global config', () => {
    @BucketDecorator()
    class TestBucketWithConfig {}

    const { stack } = setupTestingStack();

    new Bucket(stack, {
      classResource: TestBucketWithConfig,
      eventBridgeEnabled: true,
      forceDestroy: true,
      acl: 'private',
      tags: {
        global: 'true',
      },
      transferAcceleration: true,
      versioned: true,
      lifeCycleRules: {
        global: {
          condition: {
            objectSizeGreaterThan: 20,
          },
          expiration: {
            days: 200,
          },
          transitions: [
            {
              days: 20,
              storage: 'deep_archive',
            },
          ],
        },
      },
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(S3Bucket, {
      bucket: 'TestBucketWithConfig',
      force_destroy: true,
      tags: {
        global: 'true',
      },
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

    expect(synthesized).toHaveResourceWithProperties(S3BucketLifecycleConfiguration, {
      bucket: '${aws_s3_bucket.TestBucketWithConfig-bucket.id}',
      rule: [
        {
          expiration: [
            {
              days: 200,
            },
          ],
          filter: [
            {
              object_size_greater_than: 20,
              prefix: 'global',
            },
          ],
          id: 'TestBucketWithConfig-lc-rule-global',
          status: 'Enabled',
          transition: [
            {
              days: 20,
              storage_class: 'deep_archive',
            },
          ],
        },
      ],
    });
  });
});
