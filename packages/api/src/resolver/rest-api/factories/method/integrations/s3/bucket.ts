import type { BucketIntegrationActions } from '../../../../../../main';
import type {
  Integration,
  IntegrationProps,
  OpenApiIntegrationResult,
} from '../integration.types';
import { DeleteIntegration } from './delete/delete';
import { DownloadIntegration } from './download/download';
import { UploadIntegration } from './upload/upload';

export class BucketIntegration implements Integration {
  constructor(protected props: IntegrationProps) {}

  create() {
    return this.resolve().create();
  }

  async createOpenApi(): Promise<OpenApiIntegrationResult> {
    return this.resolve().createOpenApi!();
  }

  private resolve(): Integration {
    const action = this.props.handler.action as BucketIntegrationActions;

    switch (action) {
      case 'Download':
        return new DownloadIntegration(this.props);
      case 'Upload':
        return new UploadIntegration(this.props);
      case 'Delete':
        return new DeleteIntegration(this.props);
      default:
        throw new Error('Integration method not found');
    }
  }
}
