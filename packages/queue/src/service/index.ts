import { SendMessage } from './commands/send-message/send-message';
import type { SendMessageProps } from './commands/send-message/send-message.types';
import { SendMessageBatch } from './commands/send-message-batch/send-message-batch';
import type { SendMessagesBatchProps } from './commands/send-message-batch/send-message-batch.types';

export class QueueService {
  static async sendMessage(props: SendMessageProps) {
    const queueCommand = new SendMessage(props);

    await queueCommand.exec();
  }

  static async sendBatchMessage(props: SendMessagesBatchProps) {
    const queueCommand = new SendMessageBatch(props);

    await queueCommand.exec();
  }
}
