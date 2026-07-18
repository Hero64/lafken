import type { StateMachineIntegrationActions } from '../../../../../../main';
import type {
  Integration,
  IntegrationProps,
  OpenApiIntegrationResult,
} from '../integration.types';
import { StartIntegration } from './start/start';
import { StatusIntegration } from './status/status';
import { StopIntegration } from './stop/stop';

export class StateMachineIntegration implements Integration {
  constructor(protected props: IntegrationProps) {}

  create() {
    return this.resolve().create();
  }

  async createOpenApi(): Promise<OpenApiIntegrationResult> {
    return this.resolve().createOpenApi!();
  }

  private resolve(): Integration {
    const action = this.props.handler.action as StateMachineIntegrationActions;

    switch (action) {
      case 'Start':
        return new StartIntegration(this.props);
      case 'Status':
        return new StatusIntegration(this.props);
      case 'Stop':
        return new StopIntegration(this.props);
      default:
        throw new Error('Integration method not found');
    }
  }
}
