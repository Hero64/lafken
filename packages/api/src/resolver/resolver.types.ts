import type { ApiGatewayStageConfig } from '@cdktn/provider-aws/lib/api-gateway-stage';
import type {
  ApiAuthorizerNames,
  ApiRestNames,
  ClassResource,
  ResourceOutputType,
} from '@lafken/common';
import type { AppStack } from '@lafken/resolver';
import type { ExternalRestApi } from './rest-api/external/external';
import type { InternalRestApi } from './rest-api/internal/internal';

export type RestApi = InternalRestApi | ExternalRestApi;
interface ExtendProps {
  scope: AppStack;
  api: RestApi;
}

export type ApiKeySource = 'header' | 'authorizer';

/**
 * HTTP methods allowed for CORS requests
 */
export type CorsHttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'HEAD'
  | 'OPTIONS';

/**
 * CORS configuration options for API Gateway
 */
export interface CorsOptions {
  /**
   * Specifies the origins that are allowed to make requests to the API.
   * Can be:
   * - `true`: Allow all origins (*)
   * - `false`: Disable CORS
   * - `string`: Single origin (e.g., 'https://example.com')
   * - `string[]`: Multiple specific origins
   * - `RegExp`: Pattern to match origins
   *
   * @default false
   */
  allowOrigins?: boolean | string | string[] | RegExp;

  /**
   * Specifies the HTTP methods that are allowed when accessing the resource.
   *
   * @default ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE']
   */
  allowMethods?: CorsHttpMethod[];

  /**
   * Specifies the headers that are allowed in the actual request.
   * Can be:
   * - `true`: Allow all headers (*)
   * - `string[]`: Specific headers to allow
   *
   * @default true
   */
  allowHeaders?: boolean | string[];

  /**
   * Specifies the headers that are exposed to the client.
   * These are the headers that the client can access from the response.
   *
   * @default []
   */
  exposeHeaders?: string[];

  /**
   * Indicates whether the request can include credentials (cookies, authorization headers, etc.).
   * When set to true, the Access-Control-Allow-Credentials header is set to true.
   *
   * @default false
   */
  allowCredentials?: boolean;

  /**
   * Specifies how long (in seconds) the browser can cache the preflight response.
   * This reduces the number of preflight requests for subsequent requests.
   *
   * @default 86400 (24 hours)
   */
  maxAge?: number;

  /**
   * Indicates whether to add CORS headers to error responses.
   * This is useful for handling CORS in error scenarios.
   *
   * @default true
   */
  addToErrorResponses?: boolean;
}

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

export type ApiOutputAttributes = 'arn' | 'id' | 'executionArn';

export interface BaseApiProps {
  name: ApiRestNames;
  cors?: CorsOptions;
  stages?: Stage[];
  auth?: {
    authorizers: ClassResource[];
    defaultAuthorizerName: ApiAuthorizerNames;
  };
}

export interface RestApiProps extends BaseApiProps {
  isExternal?: never;
  /**
   * Defines the source from which the API Gateway retrieves the API key
   * for request validation.
   * Supported values are:
   * - `header`: API key is expected in the `x-api-key` header.
   * - `authorizer`: API key is provided by a custom authorizer.
   */
  apiKeySource?: ApiKeySource;
  /**
   * Defines the list of media (MIME) types supported by the API Gateway.
   * These values specify the `Content-Type` that the API accepts or returns.
   *
   * @example
   * {
   *   supportedMediaTypes: ['image/png']
   * }
   */
  supportedMediaTypes?: MediaTypes[];

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
   * Defines which API Gateway REST API attributes should be exported.
   *
   * Supported attributes are based on Terraform `aws_api_gateway_rest_api`
   * attribute reference:
   * - `arn`: The REST API ARN.
   * - `id`: The REST API ID.
   * - `executionArn`: Execution ARN (`execution_arn` in Terraform docs),
   *   useful for composing Lambda permission `sourceArn` values.
   *
   * Each selected attribute can be exported through SSM Parameter Store (`type: 'ssm'`)
   * or Terraform outputs (`type: 'output'`).
   *
   * @example
   * {
   *   output: [
   *     { type: 'ssm', name: '/my-api/execution-arn', value: 'executionArn' },
   *     { type: 'output', name: 'api_arn', value: 'arn' }
   *   ]
   * }
   */
  outputs?: ResourceOutputType<ApiOutputAttributes>;
}

export interface ExternalApiProps extends BaseApiProps {
  /**
   * Marks the REST API as an external resource.
   *
   * When set to `true`, the API Gateway is not created by the framework.
   * Instead, it references an existing API Gateway REST API using the provided `name`.
   */
  isExternal: true;
}

export interface RestApiOptionBase {
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
export interface InternalRestApiOptions extends RestApiOptionBase {
  /**
   * Defines the properties of the REST API for API Gateway.
   */
  restApi: RestApiProps;
}
export interface ExternalRestApiOptions extends RestApiOptionBase {
  /**
   * Defines the properties of the REST API for API Gateway.
   */
  restApi: ExternalApiProps;
}

export type RestApiOptions = InternalRestApiOptions | ExternalRestApiOptions;
