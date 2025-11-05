import type { ResponseHandler } from '../../../helpers/response/response.types';
import type { IntegrationProps } from '../../integration.types';

export interface StateMachineIntegrationBaseProps<T> extends IntegrationProps {
  action: string;
  roleArn: string;
  successResponse: Omit<ResponseHandler, 'statusCode'>;
  createTemplate: (response: T) => string;
}
