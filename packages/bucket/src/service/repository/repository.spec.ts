import 'reflect-metadata';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from 'vitest';
import { Bucket } from '../../main';
import * as clientModule from '../client/client';
import { createRepository } from './repository';

@Bucket({ name: 'example' })
class ExampleBucket {}

describe('createRepository', () => {
  let repository: ReturnType<typeof createRepository>;
  let sendMock: MockInstance;

  beforeEach(() => {
    sendMock = vi
      .spyOn(clientModule.client, 'send')
      .mockImplementation(async (_command: any) => ({}));
    repository = createRepository(ExampleBucket);
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it('should copy the object and delete the source on move', async () => {
    await repository.moveObject({
      Key: 'moved/file.txt',
      CopySource: '/example/original/file.txt',
    });

    const [copyCommand] = sendMock.mock.calls[0];
    expect(copyCommand).toBeInstanceOf(CopyObjectCommand);
    expect(copyCommand.input.Bucket).toBe('example');
    expect(copyCommand.input.Key).toBe('moved/file.txt');

    const [deleteCommand] = sendMock.mock.calls[1];
    expect(deleteCommand).toBeInstanceOf(DeleteObjectCommand);
    expect(deleteCommand.input.Bucket).toBe('example');
    expect(deleteCommand.input.Key).toBe('original/file.txt');
  });

  it('should delete the source object from its own bucket on move', async () => {
    await repository.moveObject({
      Key: 'file.txt',
      CopySource: 'other-bucket/nested%20folder/file.txt?versionId=v1',
    });

    const [deleteCommand] = sendMock.mock.calls[1];
    expect(deleteCommand.input.Bucket).toBe('other-bucket');
    expect(deleteCommand.input.Key).toBe('nested folder/file.txt');
    expect(deleteCommand.input.VersionId).toBe('v1');
  });

  it('should reject a move with an invalid CopySource', async () => {
    await expect(
      repository.moveObject({ Key: 'file.txt', CopySource: 'file.txt' })
    ).rejects.toThrow('Invalid CopySource');

    expect(sendMock).not.toHaveBeenCalled();
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
