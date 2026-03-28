import { DataAwsS3Bucket } from '@cdktn/provider-aws/lib/data-aws-s3-bucket';
import { lafkenResource } from '@lafken/resolver';
import type { Construct } from 'constructs';
import type { ExternalBucketMetadataProps } from '../../../main';

export class ExternalBucket extends lafkenResource.make(DataAwsS3Bucket) {
  constructor(scope: Construct, props: ExternalBucketMetadataProps) {
    const { externalBucketName, name } = props;

    super(scope, `${name}-bucket`, {
      bucket: externalBucketName,
    });

    this.isGlobal('bucket', name);
  }
}
