import type { StateMachineIntegrationActions } from '../../../../../../main';
import type { Integration, IntegrationProps } from '../integration.types';
import { StartIntegration } from './start/start';
import { StatusIntegration } from './status/status';
import { StopIntegration } from './stop/stop';

export class StateMachineIntegration implements Integration {
  constructor(protected props: IntegrationProps) {}
  async create() {
    const { handler } = this.props;

    const action = handler.action as StateMachineIntegrationActions;

    let integrationResolver: Integration | undefined;

    switch (action) {
      case 'Start':
        integrationResolver = new StartIntegration(this.props);
        break;
      case 'Status':
        integrationResolver = new StatusIntegration(this.props);
        break;
      case 'Stop':
        integrationResolver = new StopIntegration(this.props);
        break;
    }

    if (!integrationResolver) {
      throw new Error('Integration method not found');
    }

    return integrationResolver.create();
  }
}
