import type { ClassResource } from '@alicanto/common';
import { BucketMetadataKeys, type BucketMetadataProps } from '../../main/bucket';

export const getBucketInformation = <E extends ClassResource>(bucket: E) => {
  const bucketProps: BucketMetadataProps = Reflect.getMetadata(
    BucketMetadataKeys.BUCKET,
    bucket
  );

  return bucketProps;
};
