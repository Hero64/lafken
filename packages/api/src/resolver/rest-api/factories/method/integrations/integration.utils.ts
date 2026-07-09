import { ApiGatewayIntegration } from '@cdktn/provider-aws/lib/api-gateway-integration';
import { lafkenResource } from '@lafken/resolver';
import type {
  XAmazonIntegration,
  XAmazonIntegrationResponse,
} from '../../openapi/openapi.types';

export const LafkenIntegration = lafkenResource.make(ApiGatewayIntegration);

/**
 * Backend portion of an `ApiGatewayIntegration` config, shared by the resource
 * and openapi creation paths (excludes wiring such as `resourceId`/`dependsOn`).
 */
export interface IntegrationBackendConfig {
  type: 'AWS' | 'MOCK';
  integrationHttpMethod?: string;
  uri?: string;
  credentials?: string;
  passthroughBehavior?: string;
  requestParameters?: Record<string, string>;
  requestTemplates?: Record<string, string>;
}

/**
 * Maps a backend integration config to the `x-amazon-apigateway-integration`
 * extension used inside an OpenAPI operation.
 */
export function toXAmazonIntegration(
  config: IntegrationBackendConfig,
  responses: Record<string, XAmazonIntegrationResponse>
): XAmazonIntegration {
  return {
    type: config.type.toLowerCase() as XAmazonIntegration['type'],
    httpMethod: config.integrationHttpMethod,
    uri: config.uri,
    credentials: config.credentials,
    passthroughBehavior: config.passthroughBehavior,
    requestParameters: config.requestParameters,
    requestTemplates: config.requestTemplates,
    responses,
  };
}
