import type { ClassResource } from '@lafken/common';
import { BucketMetadataKeys } from '../../main/bucket';

export const getBucketInformation = <T>(bucket: ClassResource) => {
  const bucketProps = Reflect.getMetadata(BucketMetadataKeys.bucket, bucket);

  return bucketProps as T;
};

/**
 * Splits a CopySource value (`/sourceBucket/sourceKey?versionId=id`) into the
 * bucket, key and version of the object being copied. The key is URL decoded,
 * as required by the S3 CopyObject API.
 */
export const parseCopySource = (copySource: string | undefined) => {
  const [source, query] = (copySource || '').replace(/^\//, '').split('?');
  const separatorIndex = source.indexOf('/');

  if (separatorIndex < 1 || separatorIndex === source.length - 1) {
    throw new Error(
      `Invalid CopySource "${copySource}", expected format "sourceBucket/sourceKey"`
    );
  }

  return {
    Bucket: source.slice(0, separatorIndex),
    Key: decodeURIComponent(source.slice(separatorIndex + 1)),
    VersionId: query
      ? new URLSearchParams(query).get('versionId') || undefined
      : undefined,
  };
};
