import type { ClassResource } from '@alicanto/common';
import type { AppModule, ResolverType } from '@alicanto/resolver';
import { Bucket } from './bucket/bucket';
import type { BucketGlobalConfig } from './bucket/bucket.types';

export class BucketResolver implements ResolverType {
  public type = 'BUCKET';

  constructor(
    private buckets: ClassResource[],
    private config: BucketGlobalConfig = {}
  ) {}

  public beforeCreate(scope: AppModule) {
    for (const bucket of this.buckets) {
      new Bucket(scope, {
        ...this.config,
        classResource: bucket,
      });
    }
  }

  public create() {
    throw new Error('It is not possible to parse this service');
  }
}
