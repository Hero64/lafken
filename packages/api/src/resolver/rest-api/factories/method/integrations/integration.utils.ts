import { ApiGatewayIntegration } from '@cdktn/provider-aws/lib/api-gateway-integration';
import {
  getMetadataPrototypeByKey,
  type StreamingMethods,
  StreamingReflectKeys,
} from '@lafken/common';
import { lafkenResource } from '@lafken/resolver';
import type {
  XAmazonIntegration,
  XAmazonIntegrationResponse,
} from '../../openapi/openapi.types';
import type { IntegrationProps } from './integration.types';

export const LafkenIntegration = lafkenResource.make(ApiGatewayIntegration);

/**
 * Whether the handler behind this method was decorated with `@Streaming()`.
 * Only the default Lambda integration knows how to run a response-streaming
 * handler; other integrations (bucket, queue, mock, ...) never invoke a
 * Lambda directly and so cannot support it.
 */
export const isStreamingHandler = (
  props: Pick<IntegrationProps, 'classResource' | 'handler'>
): boolean => {
  const { classResource, handler } = props;

  const streamingMethods = getMetadataPrototypeByKey<StreamingMethods>(
    classResource,
    StreamingReflectKeys.streaming
  );

  return Boolean(streamingMethods?.[handler.name]);
};

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
