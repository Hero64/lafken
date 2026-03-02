import type { S3Bucket } from '@cdktn/provider-aws/lib/s3-bucket';
import type { ClassResource } from '@lafken/common';
import type { AppStack } from '@lafken/resolver';

interface ExtendProps {
  scope: AppStack;
  bucket: S3Bucket;
}

export interface ClassResourceExtends {
  bucket: ClassResource;
  extends: (props: ExtendProps) => void;
}
