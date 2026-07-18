import type { KinesisIntegrationActions } from '../../../../../../main';
import type {
  Integration,
  IntegrationProps,
  OpenApiIntegrationResult,
} from '../integration.types';
import { PutRecordIntegration } from './put-record/put-record';

export class KinesisIntegration implements Integration {
  constructor(protected props: IntegrationProps) {}

  create() {
    return this.resolve().create();
  }

  async createOpenApi(): Promise<OpenApiIntegrationResult> {
    return this.resolve().createOpenApi!();
  }

  private resolve(): Integration {
    const action = this.props.handler.action as KinesisIntegrationActions;

    switch (action) {
      case 'PutRecord':
        return new PutRecordIntegration(this.props);
      default:
        throw new Error('Integration method not found');
    }
  }
}
