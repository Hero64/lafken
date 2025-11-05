import type { BucketIntegrationActions } from '../../../../../../main';
import type { Integration, IntegrationProps } from '../integration.types';
import { DeleteIntegration } from './delete/delete';
import { DownloadIntegration } from './download/download';
import { UploadIntegration } from './upload/upload';

export class BucketIntegration implements Integration {
  constructor(protected props: IntegrationProps) {}
  async create() {
    const { handler } = this.props;

    const action = handler.action as BucketIntegrationActions;

    let integrationResolver: Integration | undefined;

    switch (action) {
      case 'Download':
        integrationResolver = new DownloadIntegration(this.props);
        break;
      case 'Upload':
        integrationResolver = new UploadIntegration(this.props);
        break;
      case 'Delete':
        integrationResolver = new DeleteIntegration(this.props);
        break;
    }

    if (!integrationResolver) {
      throw new Error('Integration method not found');
    }

    return integrationResolver.create();
  }
}
