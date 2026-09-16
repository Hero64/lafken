import type { ApiGatewayIntegrationResponseConfig } from '@cdktn/provider-aws/lib/api-gateway-integration-response';
import type { ResponseFieldMetadata } from '../../../../../../main';

export interface ResponseHandler
  extends Pick<ApiGatewayIntegrationResponseConfig, 'statusCode' | 'selectionPattern'> {
  field?: ResponseFieldMetadata;
  template?: string;
  methodParameters?: Record<string, boolean>;
  integrationParameters?: Record<string, string>;
  /**
   * The integration body is forwarded untouched and may not be text, as in an
   * S3 object download. A mapping template cannot be attached to it without
   * corrupting the payload, so features that need one are rejected instead.
   */
  rawBody?: boolean;
}
