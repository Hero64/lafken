import 'reflect-metadata';
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';

import { createRepository } from './repository';
import { Bucket } from '../../main';
import * as clientModule from '../client/client';

@Bucket({ name: 'example' })
class ExampleBucket {}

describe('createRepository', () => {
  let repository: ReturnType<typeof createRepository>;
  let sendMock: jest.SpyInstance;

  beforeEach(() => {
    sendMock = jest
      .spyOn(clientModule.client, 'send')
      .mockImplementation(async (_command: any) => ({}));
    repository = createRepository(ExampleBucket);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should call PutObjectCommand with correct bucket', async () => {
    await repository.putObject({ Key: 'file.txt', Body: 'hello' });

    expect(sendMock).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    const command = sendMock.mock.calls[0][0];
    expect(command.input.Bucket).toBe('example');
    expect(command.input.Key).toBe('file.txt');
  });

  it('should call GetObjectCommand with correct bucket', async () => {
    await repository.getObject({ Key: 'file.txt' });

    expect(sendMock).toHaveBeenCalledWith(expect.any(GetObjectCommand));
    const command = sendMock.mock.calls[0][0];
    expect(command.input.Bucket).toBe('example');
  });

  it('should call DeleteObjectCommand with correct bucket', async () => {
    await repository.deleteObject({ Key: 'file.txt' });

    expect(sendMock).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    const command = sendMock.mock.calls[0][0];
    expect(command.input.Bucket).toBe('example');
  });

  it('should call CopyObjectCommand with correct bucket', async () => {
    await repository.copyObject({ Key: 'file.txt', CopySource: '/source/file.txt' });

    expect(sendMock).toHaveBeenCalledWith(expect.any(CopyObjectCommand));
    const command = sendMock.mock.calls[0][0];
    expect(command.input.Bucket).toBe('example');
  });

  it('should list objects with pagination', async () => {
    sendMock
      .mockResolvedValueOnce({
        Contents: [{ Key: 'a.txt' }],
        IsTruncated: true,
        ContinuationToken: 'token-1',
      })
      .mockResolvedValueOnce({
        Contents: [{ Key: 'b.txt' }],
        IsTruncated: false,
      });

    const response = await repository.listObjects({});

    expect(sendMock).toHaveBeenCalledWith(expect.any(ListObjectsV2Command));
    expect(response.Contents).toEqual([{ Key: 'a.txt' }, { Key: 'b.txt' }]);
  });
});
