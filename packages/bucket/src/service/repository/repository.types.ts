import type {
  _Object,
  CopyObjectCommandInput,
  CopyObjectCommandOutput,
  DeleteObjectCommandInput,
  DeleteObjectCommandOutput,
  GetObjectCommandInput,
  GetObjectCommandOutput,
  ListObjectsV2CommandInput,
  PutObjectCommandInput,
  PutObjectCommandOutput,
  S3Client,
} from '@aws-sdk/client-s3';
import type { ClassResource } from '@lafken/common';

export type InputWithoutBucket<T> = Omit<T, 'Bucket'>;

export interface RepositoryOptions {
  /**
   * S3 client used by every operation of the repository.
   *
   * Injecting a client is the way to reach a bucket on a different region, account or endpoint,
   * for example a local S3-compatible instance during development.
   *
   * @default The shared client built from the ambient AWS SDK configuration.
   */
  client?: S3Client;
}

export type RepositoryReturn<_E extends ClassResource> = {
  putObject(
    props: InputWithoutBucket<PutObjectCommandInput>
  ): Promise<PutObjectCommandOutput>;
  getObject(
    props: InputWithoutBucket<GetObjectCommandInput>
  ): Promise<GetObjectCommandOutput>;
  deleteObject(
    props: InputWithoutBucket<DeleteObjectCommandInput>
  ): Promise<DeleteObjectCommandOutput>;
  copyObject(
    props: InputWithoutBucket<CopyObjectCommandInput>
  ): Promise<CopyObjectCommandOutput>;
  moveObject(props: InputWithoutBucket<CopyObjectCommandInput>): Promise<void>;
  listObjects(props: InputWithoutBucket<ListObjectsV2CommandInput>): Promise<{
    Contents: _Object[];
  }>;
};
