import { SendMessageCommand } from '@aws-sdk/client-sqs';
import { client } from '../../client/client';
import { SendMessage } from './send-message';

jest.mock('../../client/client', () => ({
  client: {
    send: jest.fn(),
  },
}));

describe('SendMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should generate body and message attributes', async () => {
    const props = {
      url: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
      body: { foo: 'bar' },
      delay: 10,
      groupId: 'group-1',
      deduplicationId: 'dedup-1',
    };

    const sendMessage = new SendMessage(props);

    (client.send as jest.Mock).mockResolvedValueOnce({ MessageId: '123' });

    const result = await sendMessage.exec();

    expect(client.send).toHaveBeenCalledTimes(1);

    const commandInstance = (client.send as jest.Mock).mock.calls[0][0];
    expect(commandInstance).toBeInstanceOf(SendMessageCommand);

    expect((commandInstance as SendMessageCommand).input).toEqual({
      QueueUrl: props.url,
      MessageBody: JSON.stringify(props.body),
      MessageAttributes: {
        foo: {
          DataType: 'String',
          StringValue: 'bar',
        },
      },
      DelaySeconds: 10,
      MessageGroupId: 'group-1',
      MessageDeduplicationId: 'dedup-1',
    });

    expect(result).toEqual({ MessageId: '123' });
  });
});
