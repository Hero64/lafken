import type { Services } from '@lafken/common';
import type { IntegrationProps } from '../../integration.types';

export interface StateMachineIntegrationBaseProps<T> extends IntegrationProps {
  action: string;
  service: Services;
  createTemplate: (response: T) => string;
}
