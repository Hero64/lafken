import { Method } from '../../../../../../../main';
import type { Integration, IntegrationProps } from '../../integration.types';
import { BucketBaseIntegration } from '../base/base';

export class UploadIntegration extends BucketBaseIntegration implements Integration {
  constructor(props: IntegrationProps) {
    super({
      ...props,
      httpMethod: Method.PUT,
    });
  }
}
