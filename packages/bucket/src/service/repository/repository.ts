import type { ClassResource } from '@really-less/common';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type DeleteObjectCommandInput,
  type GetObjectCommandInput,
  type CopyObjectCommandInput,
  type ListObjectsV2CommandInput,
  type ListObjectsV2CommandOutput,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';

import { getBucketInformation } from './repository.utils';
import { client, getClientWithXRay } from '../client/client';
import type { InputWithoutBucket } from './repository.types';

export const createRepository = <E extends ClassResource>(bucket: E) => {
  const { name, tracing } = getBucketInformation(bucket);

  const bucketClient = tracing ? getClientWithXRay() : client;

  return {
    putObject(props: InputWithoutBucket<PutObjectCommandInput>) {
      const command = new PutObjectCommand({
        Bucket: name,
        ...props,
      });
      return bucketClient.send(command);
    },
    getObject(props: InputWithoutBucket<GetObjectCommandInput>) {
      const command = new GetObjectCommand({
        Bucket: name,
        ...props,
      });

      return bucketClient.send(command);
    },
    deleteObject(props: InputWithoutBucket<DeleteObjectCommandInput>) {
      const command = new DeleteObjectCommand({
        Bucket: name,
        ...props,
      });

      return bucketClient.send(command);
    },
    copyObject(props: InputWithoutBucket<CopyObjectCommandInput>) {
      const command = new CopyObjectCommand({
        Bucket: name,
        ...props,
      });

      return bucketClient.send(command);
    },
    async moveObject(props: InputWithoutBucket<CopyObjectCommandInput>) {
      await this.copyObject(props);
      await this.deleteObject({
        Key: props.Key,
      });
    },
    async listObjects(props: InputWithoutBucket<ListObjectsV2CommandInput>) {
      let allContents: ListObjectsV2CommandOutput['Contents'] = [];
      let nextToken: string | undefined = undefined;

      do {
        const command: ListObjectsV2Command = new ListObjectsV2Command({
          Bucket: name,
          ...props,
          ContinuationToken: nextToken,
        });

        const response: ListObjectsV2CommandOutput = await bucketClient.send(command);
        allContents = [...allContents, ...(response.Contents || [])];
        nextToken = response.IsTruncated ? response.ContinuationToken : undefined;
      } while (nextToken);

      return { Contents: allContents };
    },
  };
};
