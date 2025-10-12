import type { DynamoDbIntegrationActions } from '../../../../../main';
import type { Integration, IntegrationProps } from '../integration.types';
import { DeleteIntegration } from './delete/delete';
import { PutIntegration } from './put/put';
import { QueryIntegration } from './query/query';

export class DynamoDbIntegration implements Integration {
  constructor(protected props: IntegrationProps) {}
  async create() {
    const { handler } = this.props;

    const action = handler.action as DynamoDbIntegrationActions;

    let integrationResolver: Integration | undefined;

    switch (action) {
      case 'Query':
        integrationResolver = new QueryIntegration(this.props);
        break;
      case 'Put':
        integrationResolver = new PutIntegration(this.props);
        break;
      case 'Delete':
        integrationResolver = new DeleteIntegration(this.props);
        break;
    }

    if (!integrationResolver) {
      throw new Error('Integration method not found');
    }

    await integrationResolver.create();
  }
}
