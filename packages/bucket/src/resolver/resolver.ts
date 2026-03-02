import type { S3Bucket } from '@cdktn/provider-aws/lib/s3-bucket';
import type { ClassResource } from '@lafken/common';
import type { AppModule, AppStack, ResolverType } from '@lafken/resolver';
import { Bucket } from './bucket/bucket';
import type { BucketGlobalConfig } from './bucket/bucket.types';
import type { ClassResourceExtends } from './resolver.types';

export class BucketResolver implements ResolverType {
  public type = 'BUCKET';
  private extensibleBuckets: (Omit<ClassResourceExtends, 'bucket'> & {
    bucket: S3Bucket;
  })[] = [];

  constructor(
    private buckets: (ClassResource | ClassResourceExtends)[],
    private config: BucketGlobalConfig = {}
  ) {}

  public beforeCreate(scope: AppModule) {
    for (const bucket of this.buckets) {
      const isExtensible = 'bucket' in bucket;

      const bucketResource = new Bucket(scope, {
        ...this.config,
        classResource: isExtensible ? bucket.bucket : bucket,
      });

      if (isExtensible) {
        this.extensibleBuckets.push({
          bucket: bucketResource,
          extends: bucket.extends,
        });
      }
    }
  }

  public create() {
    throw new Error('It is not possible to parse this service');
  }

  public afterCreate(scope: AppStack) {
    for (const extendBucket of this.extensibleBuckets) {
      extendBucket.extends({
        scope,
        bucket: extendBucket.bucket,
      });
    }
  }
}
