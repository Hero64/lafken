import type { Method } from '../../../../../../main';
import type { IntegrationProps } from '../../integration.types';

export interface BucketIntegrationBaseProps extends IntegrationProps {
  httpMethod: Method;
}
