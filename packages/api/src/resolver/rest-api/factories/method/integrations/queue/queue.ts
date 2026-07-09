import type { QueueIntegrationActions } from '../../../../../../main';
import type {
  Integration,
  IntegrationProps,
  OpenApiIntegrationResult,
} from '../integration.types';
import { SendMessageIntegration } from './send-message/send-message';

export class QueueIntegration implements Integration {
  constructor(protected props: IntegrationProps) {}

  create() {
    return this.resolve().create();
  }

  async createOpenApi(): Promise<OpenApiIntegrationResult> {
    return this.resolve().createOpenApi!();
  }

  private resolve(): Integration {
    const action = this.props.handler.action as QueueIntegrationActions;

    switch (action) {
      case 'SendMessage':
        return new SendMessageIntegration(this.props);
      default:
        throw new Error('Integration method not found');
    }
  }
}
