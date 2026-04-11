import type { ApiGatewayStageConfig } from '@cdktn/provider-aws/lib/api-gateway-stage';
import type {
  ApiAuthorizerNames,
  ApiRestNames,
  ClassResource,
  GetResourceProps,
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

export type EndpointType = 'edge' | 'regional' | 'private';

export type EndpointIpAddressType = 'ipv4' | 'dualstack';

/**
 * Endpoint configuration options for API Gateway REST API.
 */
export interface PrivateEndpointConfigurationOptions {
  /**
   * Endpoint type.
   * Must be `private`.
   */
  type: 'private';

  /**
   * Set of VPC endpoint identifiers.
   * Supported only when endpoint type is `PRIVATE`.
   */
  vpcEndpointIds:
    | string[]
    | ((props: Omit<GetResourceProps, 'getResourceValue'>) => string[]);
}

/**
 * Endpoint configuration options for non-private API Gateway REST API endpoints.
 */
export interface NonPrivateEndpointConfigurationOptions {
  /**
   * The IP address types that can invoke the API.
   * - `ipv4`: Allows only IPv4 clients.
   * - `dualstack`: Allows both IPv4 and IPv6 clients.
   *
   * Terraform drift detection for this argument is performed only when a value is provided.
   */
  ipAddressType?: EndpointIpAddressType;

  /**
   * Endpoint type.
   * Valid values are `edge` or `regional`.
   */
  type: Exclude<EndpointType, 'private'>;
}

export type EndpointConfigurationOptions =
  | PrivateEndpointConfigurationOptions
  | NonPrivateEndpointConfigurationOptions;

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

export type StageLogGroupFormatKeys =
  | 'requestId'
  | 'extendedRequestId'
  | 'caller'
  | 'user'
  | 'ip'
  | 'requestTime'
  | 'httpMethod'
  | 'resourcePath'
  | 'status'
  | 'protocol'
  | 'responseLength';

export interface Stage
  extends Omit<
    ApiGatewayStageConfig,
    | 'restApiId'
    | 'deploymentId'
    | 'accessLogSettings'
    | 'canarySettings'
    | 'clientCertificateId'
  > {
  /**
   * Access log settings for the API Gateway stage.
   *
   * Configures CloudWatch Logs for capturing API Gateway access logs,
   * enabling monitoring and analysis of API request activity.
   *
   * @example
   * {
   *   accessLogSettings: {
   *     logGroupName: '/aws/apigateway/my-api',
   *     retentionDays: 30,
   *     formatKeys: ['requestId', 'ip', 'httpMethod', 'resourcePath', 'status'],
   *   }
   * }
   */
  accessLogSettings?: {
    /**
     * CloudWatch Log Group name.
     *
     * Defines the name of the CloudWatch Log Group where the
     * API Gateway access logs will be sent.
     *
     * @example '/aws/apigateway/my-api'
     */
    logGroupName: string;
    /**
     * Log retention period in days.
     *
     * Specifies the number of days to retain the access logs
     * in the CloudWatch Log Group before they are automatically deleted.
     */
    retentionDays?: number;
    /**
     * Access log format keys.
     *
     * Specifies which request/response fields are included in the
     * access log entries. Each key maps to a `$context` variable
     * in the API Gateway access log format.
     */
    formatKeys: StageLogGroupFormatKeys[];
  };
}

export type ApiOutputAttributes = 'arn' | 'id' | 'executionArn';

export type ApiDefaultResponseType =
  | 'badRequestBody'
  | 'accessDenied'
  | 'apiConfigurationError'
  | 'authorizerConfigurationError'
  | 'authorizerFailure'
  | 'badRequestParameters'
  | 'default4xx'
  | 'default5xx'
  | 'expiredToken'
  | 'integrationFailure'
  | 'integrationTimeout'
  | 'invalidApiKey'
  | 'invalidSignature'
  | 'missingAuthenticationToken'
  | 'quotaExceeded'
  | 'requestTooLarge'
  | 'resourceNotFound'
  | 'throttled'
  | 'unauthorized'
  | 'unsupportedMediaType'
  | 'wafFiltered';

export type ApiDefaultResponse = Partial<
  Record<ApiDefaultResponseType, Record<string, string>>
>;

export interface BaseApiProps {
  /**
   * Unique name identifier for the API Gateway REST API.
   *
   * Used as the resource name within the AWS stack.
   */
  name: ApiRestNames;
  /**
   * CORS configuration for the REST API.
   *
   * Defines cross-origin resource sharing rules including allowed
   * origins, methods, headers, and credentials policies.
   */
  cors?: CorsOptions;
  /**
   * Stage configurations for the API Gateway deployment.
   *
   * Each stage represents a deployed snapshot of the API (e.g., `api`, `staging`).
   * If not provided, a default stage named `api` is created.
   */
  stages?: Stage[];
  /**
   * Authorization configuration for the REST API.
   *
   * Defines the authorizer classes and the default authorizer
   * applied to all endpoints unless overridden at the method level.
   */
  auth?: {
    authorizers: ClassResource[];
    defaultAuthorizerName: ApiAuthorizerNames;
  };
  /**
   * Custom gateway responses for specific API Gateway error types.
   *
   * Allows overriding the default response body for error scenarios
   * such as unauthorized access, throttling, or integration failures.
   *
   * @example
   * {
   *   defaultResponses: {
   *     unauthorized: { message: 'Unauthorized' },
   *     default4xx: { message: 'Client Error' },
   *   }
   * }
   */
  defaultResponses?: ApiDefaultResponse;

  /**
   * Description of the API Gateway REST API.
   *
   * Provides a human-readable summary of the API's purpose,
   * displayed in the AWS console and included in the Terraform resource.
   *
   * @example 'REST API for managing user resources'
   */
  description?: string;
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
   * Defines API Gateway endpoint configuration.
   */
  endpointConfiguration?: EndpointConfigurationOptions;

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
