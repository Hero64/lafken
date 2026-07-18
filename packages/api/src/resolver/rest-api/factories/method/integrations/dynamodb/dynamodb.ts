import type { DynamoDbIntegrationActions } from '../../../../../../main';
import type {
  Integration,
  IntegrationProps,
  OpenApiIntegrationResult,
} from '../integration.types';
import { DeleteIntegration } from './delete/delete';
import { PutIntegration } from './put/put';
import { QueryIntegration } from './query/query';

export class DynamoDbIntegration implements Integration {
  constructor(protected props: IntegrationProps) {}

  create() {
    return this.resolve().create();
  }

  async createOpenApi(): Promise<OpenApiIntegrationResult> {
    return this.resolve().createOpenApi!();
  }

  private resolve(): Integration {
    const action = this.props.handler.action as DynamoDbIntegrationActions;

    switch (action) {
      case 'Query':
        return new QueryIntegration(this.props);
      case 'Put':
        return new PutIntegration(this.props);
      case 'Delete':
        return new DeleteIntegration(this.props);
      default:
        throw new Error('Integration method not found');
    }
  }
}
