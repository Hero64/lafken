import type { EventBridgeIntegrationActions } from '../../../../../../main';
import type {
  Integration,
  IntegrationProps,
  OpenApiIntegrationResult,
} from '../integration.types';
import { PutEventsIntegration } from './put-events/put-events';

export class EventBridgeIntegration implements Integration {
  constructor(protected props: IntegrationProps) {}

  create() {
    return this.resolve().create();
  }

  async createOpenApi(): Promise<OpenApiIntegrationResult> {
    return this.resolve().createOpenApi!();
  }

  private resolve(): Integration {
    const action = this.props.handler.action as EventBridgeIntegrationActions;

    switch (action) {
      case 'PutEvents':
        return new PutEventsIntegration(this.props);
      default:
        throw new Error('Integration method not found');
    }
  }
}
