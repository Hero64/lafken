import type { QueueIntegrationActions } from '../../../../../../main';
import type { Integration, IntegrationProps } from '../integration.types';
import { SendMessageIntegration } from './send-message/send-message';

export class QueueIntegration implements Integration {
  constructor(protected props: IntegrationProps) {}
  async create() {
    const { handler } = this.props;

    const action = handler.action as QueueIntegrationActions;

    let integrationResolver: Integration | undefined;

    switch (action) {
      case 'SendMessage':
        integrationResolver = new SendMessageIntegration(this.props);
        break;
    }

    if (!integrationResolver) {
      throw new Error('Integration method not found');
    }

    return integrationResolver.create();
  }
}
