import type { ClassResource } from '@lafken/common';
import { BucketMetadataKeys } from '../../main/bucket';

export const getBucketInformation = <T>(bucket: ClassResource) => {
  const bucketProps = Reflect.getMetadata(BucketMetadataKeys.bucket, bucket);

  return bucketProps as T;
};
