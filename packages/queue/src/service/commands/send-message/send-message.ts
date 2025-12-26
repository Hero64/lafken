import { SendMessageCommand } from '@aws-sdk/client-sqs';
import { client } from '../../client/client';
import { SendMessageBase } from '../send-message-base/send-message-base';
import type { SendMessageProps } from './send-message.types';

export class SendMessage extends SendMessageBase {
  constructor(private props: SendMessageProps) {
    super();
  }

  exec() {
    const command = new SendMessageCommand({
      QueueUrl: this.props.url,
      MessageBody: this.getBody(this.props.body),
      MessageAttributes: this.getAttributes(this.props.body),
      DelaySeconds: this.props.delay,
      MessageGroupId: this.props.groupId,
      MessageDeduplicationId: this.props.deduplicationId,
    });

    return client.send(command);
  }
}
