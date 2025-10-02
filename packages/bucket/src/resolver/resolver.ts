import type { ClassResource } from '@alicanto/common';
import type { AppStack, ResolverType } from '@alicanto/resolver';

import { BucketParser } from './parser/parser';
import type { BucketGlobalConfig } from './resolver.types';

export class BucketResolver implements ResolverType {
  public type = 'BUCKET';

  private config: BucketGlobalConfig;
  constructor(
    private buckets: ClassResource[],
    config: BucketGlobalConfig = {}
  ) {
    this.config = config;
  }

  public async beforeCreate(scope: AppStack) {
    for (const bucket of this.buckets) {
      const bucketParser = new BucketParser(scope, bucket, this.config);
      bucketParser.generate();
    }
  }

  public async create() {
    throw new Error('It is not possible to parse this service');
  }
}
