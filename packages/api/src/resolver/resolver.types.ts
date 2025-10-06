import type { ApiAuthorizerNames, ApiRestNames, ClassResource } from '@alicanto/common';
import type { AppStack } from '@alicanto/resolver';
import type { ApiGatewayStageConfig } from '@cdktf/provider-aws/lib/api-gateway-stage';

import type { RestApi } from './rest-api/rest-api';

interface ExtendProps {
  scope: AppStack;
  api: RestApi;
}

export type ApiKeySource = 'header' | 'authorizer';
type MediaTypes =
  | 'image/png'
  | 'image/jpeg'
  | 'text/plain'
  | 'text/html'
  | 'text/css'
  | 'text/javascript'
  | 'application/json'
  | 'application/xml'
  | 'application/pdf'
  | 'application/zip'
  | 'application/octet-stream'
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp'
  | 'image/svg+xml'
  | 'audio/mpeg'
  | 'audio/ogg'
  | 'audio/wav'
  | 'video/mp4'
  | 'video/webm'
  | 'application/msword'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'application/vnd.ms-excel'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  | 'application/vnd.ms-powerpoint'
  | 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  | (string & {});

export interface Stage
  extends Omit<
    ApiGatewayStageConfig,
    | 'restApiId'
    | 'deploymentId'
    | 'accessLogSettings'
    | 'canarySettings'
    | 'clientCertificateId'
  > {}

export interface RestApiProps {
  /**
   * Defines the name of the API Gateway REST API.
   */
  name: ApiRestNames;
  /**
   * Defines the source from which the API Gateway retrieves the API key
   * for request validation.
   * Supported values are:
   * - `header`: API key is expected in the `x-api-key` header.
   * - `authorizer`: API key is provided by a custom authorizer.
   */
  apiKeySource?: ApiKeySource;
  /**
   *  Defines the list of media (MIME) types supported by the API Gateway.
   * These values specify the `Content-Type` that the API accepts or returns.
   */
  supportedMediaTypes?: MediaTypes[];
  /**
   * Defines the Cross-Origin Resource Sharing (CORS) configuration for the API Gateway.
   * CORS allows or restricts resources on a web server to be requested from another domain
   * outside the one from which the resource originated.
   */
  // cors?: CorsOptions;
  /**
   * Defines whether the default `execute-api` endpoint of API Gateway should be disabled.
   * By default, every API Gateway has an automatically generated endpoint of the form:
   *   `https://{apiId}.execute-api.{region}.amazonaws.com/{stage}`
   *
   * When set to `true`, this default endpoint is disabled, which is useful when you want to expose
   * the API only through a **custom domain name** for security or branding purposes.
   */
  disableExecuteApiEndpoint?: boolean;
  /**
   * Defines the minimum payload size (in bytes) required for compression in API Gateway responses.
   * Responses smaller than this size will not be compressed, while larger responses will be compressed
   * to optimize bandwidth and improve performance.
   */
  minCompressionSize?: number;
  /**
   * TODO: cambiar estó
   */
  parameters?: Record<string, string>;
  /**
   * Defines the stage configuration for the API Gateway REST API.
   * The stage represents a deployment environment for the API, such as `dev`, `staging`, or `prod`.
   *
   * You can configure:
   * - Stage name
   * - Tracing options
   * - Throttling and caching
   */
  stage?: Stage;
  /**
   * Defines the authorization configuration for the API Gateway.
   * - `authorizers`: An array of authorizer resources to be used by the API.
   * - `defaultAuthorizerName`: The name of the default authorizer applied to all methods.
   *
   * Individual methods can override the default authorizer if needed.
   * This allows setting a global authorization strategy while providing flexibility
   * for specific endpoints.
   */
  auth?: {
    authorizers: ClassResource[];
    defaultAuthorizerName: ApiAuthorizerNames;
  };
}

export interface RestApiOptions {
  /**
   * Defines the properties of the REST API for API Gateway.
   */
  restApi: RestApiProps;

  /**
   * Allows extending the API Gateway with custom configurations or resources.
   * @example
   * {
   *   extend: ({ api }) => {
   *     api.addCustomDomain('api.example.com');
   *   },
   * };
   */
  extend?: (props: ExtendProps) => void;
}
