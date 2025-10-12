import type { IntegrationProps } from '../../integration.types';

export interface DynamoIntegrationBaseProps<T> extends IntegrationProps {
  action: string;
  roleArn: string;
  createTemplate: (response: T) => string;
}
