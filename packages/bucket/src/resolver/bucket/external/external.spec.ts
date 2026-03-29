import { DataAwsS3Bucket } from '@cdktn/provider-aws/lib/data-aws-s3-bucket';
import { enableBuildEnvVariable } from '@lafken/common';
import { setupTestingStack } from '@lafken/resolver';
import { Testing } from 'cdktn';
import { describe, expect, it } from 'vitest';
import {
  Bucket as BucketDecorator,
  BucketMetadataKeys,
  type ExternalBucketMetadataProps,
} from '../../../main';
import { ExternalBucket } from './external';

describe('ExternalBucket', () => {
  enableBuildEnvVariable();

  it('should create an external bucket data source', () => {
    @BucketDecorator({ isExternal: true })
    class TestBucket {}

    const { stack } = setupTestingStack();
    const bucketProps: ExternalBucketMetadataProps = Reflect.getMetadata(
      BucketMetadataKeys.bucket,
      TestBucket
    );
    new ExternalBucket(stack, bucketProps);

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveDataSource(DataAwsS3Bucket);
  });

  it('should create an external bucket with the correct bucket name', () => {
    @BucketDecorator({ isExternal: true, name: 'production-assets' })
    class AssetsBucket {}

    const { stack } = setupTestingStack();
    const bucketProps: ExternalBucketMetadataProps = Reflect.getMetadata(
      BucketMetadataKeys.bucket,
      AssetsBucket
    );
    new ExternalBucket(stack, bucketProps);

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveDataSourceWithProperties(DataAwsS3Bucket, {
      bucket: 'production-assets',
    });
  });
});
