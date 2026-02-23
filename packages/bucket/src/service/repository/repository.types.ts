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
} from '@aws-sdk/client-s3';
import type { ClassResource } from '@lafken/common';

export type InputWithoutBucket<T> = Omit<T, 'Bucket'>;

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
