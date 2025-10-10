import type { ApiGatewayIntegrationResponseConfig } from '@cdktf/provider-aws/lib/api-gateway-integration-response';
import type { ResponseFieldMetadata } from '../../../../../main';

export interface ResponseHandler
  extends Pick<ApiGatewayIntegrationResponseConfig, 'statusCode' | 'selectionPattern'> {
  field?: ResponseFieldMetadata;
  template?: string;
  methodParameters?: Record<string, boolean>;
  integrationParameters?: Record<string, string>;
}
