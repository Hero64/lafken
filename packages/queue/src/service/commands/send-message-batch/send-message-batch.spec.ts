import { SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { client } from '../../client/client';
import { SendMessageBatch } from './send-message-batch';
import type { SendMessagesBatchProps } from './send-message-batch.types';

vi.mock('../../client/client', () => {
  return {
    client: {
      send: vi.fn(),
    },
  };
});

describe('SendMessageBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Should generate batch entries from batch message', async () => {
    const props: SendMessagesBatchProps = {
      url: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
      messages: [
        {
          body: { foo: 'bar' },
          attributes: { foo: 'bar' },
          delay: 5,
          groupId: 'group-1',
          deduplicationId: 'dedup-1',
        },
        {
          body: { hello: 'world' },
          attributes: { hello: 'world' },
          delay: 10,
          groupId: 'group-2',
          deduplicationId: 'dedup-2',
        },
      ],
    };

    const sendMessageBatch = new SendMessageBatch(props);

    (client.send as Mock).mockResolvedValueOnce({
      Successful: [{ Id: '0' }, { Id: '1' }],
    });

    const result = await sendMessageBatch.exec();

    expect(client.send).toHaveBeenCalledTimes(1);

    const commandInstance = (client.send as Mock).mock.calls[0][0];
    expect(commandInstance).toBeInstanceOf(SendMessageBatchCommand);

    expect((commandInstance as SendMessageBatchCommand).input).toEqual({
      QueueUrl: props.url,
      Entries: [
        {
          Id: '0',
          MessageBody: JSON.stringify({ foo: 'bar' }),
          MessageAttributes: {
            foo: { DataType: 'String', StringValue: 'bar' },
          },
          DelaySeconds: 5,
          MessageGroupId: 'group-1',
          MessageDeduplicationId: 'dedup-1',
        },
        {
          Id: '1',
          MessageBody: JSON.stringify({ hello: 'world' }),
          MessageAttributes: {
            hello: { DataType: 'String', StringValue: 'world' },
          },
          DelaySeconds: 10,
          MessageGroupId: 'group-2',
          MessageDeduplicationId: 'dedup-2',
        },
      ],
    });

    expect(result).toEqual({
      Successful: [{ Id: '0' }, { Id: '1' }],
    });
  });
});
