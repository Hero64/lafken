import type { KinesisIntegrationActions } from '../../../../../../main';
import type { Integration, IntegrationProps } from '../integration.types';
import { PutRecordIntegration } from './put-record/put-record';

export class KinesisIntegration implements Integration {
  constructor(protected props: IntegrationProps) {}

  async create() {
    const { handler } = this.props;

    const action = handler.action as KinesisIntegrationActions;

    let integrationResolver: Integration | undefined;

    switch (action) {
      case 'PutRecord':
        integrationResolver = new PutRecordIntegration(this.props);
        break;
    }

    if (!integrationResolver) {
      throw new Error('Integration method not found');
    }

    return integrationResolver.create();
  }
}
