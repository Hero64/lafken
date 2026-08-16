import type {
  AllowedTypes,
  ApiAuthorizerNames,
  ApiNames,
  LambdaMetadata,
  LambdaProps,
  ResourceMetadata,
  ResourceProps,
  ServicesValues,
} from '@lafken/common';
import type { ResponseFieldMetadata } from '../response';

export interface MethodAuthorizer {
  /**
   * Authorizer name.
   *
   * Specifies the name of the authorizer to be used for a method.
   * The authorizer must be previously registered in the resolver.
   */
  authorizerName?: ApiAuthorizerNames;
  /**
   * Authorizer permissions.
   *
   * Specifies one or more permission values that the authorizer will use
   * to validate access. This property should only be used with a `CustomAuthorizer`.
   * The defined permissions will be passed to the authorizer's handler
   * during execution.
   *
   * @example
   * // Define permissions for a custom authorizer
   * {
   *   scopes: ["read:user", "write:user"]
   * }
   */
  scopes?: string[];
}

export type MethodLoggingLevel = 'off' | 'error' | 'info';

export type UnauthorizedCacheControlHeaderStrategy =
  | 'fail_with_403'
  | 'succeed_with_response_header'
  | 'succeed_without_response_header';

export interface MethodSettings {
  /**
   * Indicates whether the API Gateway cache is encrypted.
   *
   * When enabled, the cache data for this method is encrypted at rest.
   *
   * @default false
   */
  cacheDataEncrypted?: boolean;
  /**
   * Time-to-live (TTL) for cached responses, in seconds.
   *
   * Specifies how long API Gateway caches the method response before
   * forwarding the request to the backend again.
   *
   * @default 300
   */
  cacheTtlInSeconds?: number;
  /**
   * Indicates whether caching is enabled for the method.
   *
   * Requires a cache cluster to be configured on the stage.
   *
   * @default false
   */
  cachingEnabled?: boolean;
  /**
   * Enables full request and response data logging for the method.
   *
   * Captures the request and response payloads in CloudWatch Logs.
   *
   * @default false
   */
  dataTraceEnabled?: boolean;
  /**
   * Logging level for the method.
   *
   * Controls the verbosity of the logs written to CloudWatch Logs.
   *
   * @default "off"
   */
  loggingLevel?: MethodLoggingLevel;
  /**
   * Indicates whether CloudWatch metrics are enabled for the method.
   *
   * @default false
   */
  metricsEnabled?: boolean;
  /**
   * Whether authorization is required before honoring `Cache-Control`
   * directives on the request.
   *
   * @default true
   */
  requireAuthorizationForCacheControl?: boolean;
  /**
   * The maximum number of requests that can be sent to the method in a
   * short burst before throttling kicks in.
   *
   * This value only takes effect if the stage has throttling limits
   * configured.
   */
  throttlingBurstLimit?: number;
  /**
   * The steady-state request rate limit, in requests per second, for
   * the method.
   *
   * This value only takes effect if the stage has throttling limits
   * configured.
   */
  throttlingRateLimit?: number;
  /**
   * Strategy used when a `Cache-Control` directive is sent without
   * authorization and authorization is required.
   *
   * @default "succeed_without_response_header"
   */
  unauthorizedCacheControlHeaderStrategy?: UnauthorizedCacheControlHeaderStrategy;
}

export interface StageMethodSettings extends MethodSettings {
  /**
   * Stage name.
   *
   * Specifies the API Gateway stage this method settings block applies to.
   * The stage must be configured in the `@Api` resolver (`stages` prop).
   */
  stageName: string;
}

export type MethodSettingsConfig = MethodSettings | StageMethodSettings[];

export interface ApiLambdaBaseProps {
  /**
   * Method settings.
   *
   * Configures API Gateway features (caching, logging, metrics and
   * throttling) for this method at the stage level, rendered as
   * `aws_api_gateway_method_settings` resources.
   *
   * Accepts either:
   * - A single settings object, which is applied to **every** stage of the
   *   REST API.
   * - An array of stage-scoped settings, where each entry targets a specific
   *   stage by name.
   *
   * @example
   * // Apply to every stage
   * {
   *   methodSettings: {
   *     cachingEnabled: true,
   *     cacheTtlInSeconds: 300,
   *     metricsEnabled: true,
   *     loggingLevel: 'info',
   *     throttlingRateLimit: 100,
   *     throttlingBurstLimit: 50,
   *   }
   * }
   *
   * @example
   * // Apply only to specific stages
   * {
   *   methodSettings: [
   *     {
   *       stageName: 'staging',
   *       loggingLevel: 'error',
   *     },
   *     {
   *       stageName: 'prod',
   *       cachingEnabled: true,
   *       metricsEnabled: true,
   *     },
   *   ]
   * }
   */
  methodSettings?: MethodSettingsConfig;
  /**
   * Method path.
   *
   * Specifies the path for this individual API method. The value
   * will be appended to the base path defined in the `@Api` decorator
   * of the class.
   *
   * @example
   * // Define a method path appended to the class base path
   * @ApiMethod({
   *   path: "/create"
   * })
   * // If the class `@Api` has path "/users", the full path will be "/users/create"
   */
  path?: string;
  /**
   * Method description.
   *
   * Provides a textual description for the API method. This description
   * will also be applied to the Lambda function, making it easier to
   * understand the purpose of the method when reviewing logs, monitoring,
   * or the AWS console.
   */
  description?: string;
  /**
   * Method response type.
   *
   * Specifies the expected response of the Lambda function. This is
   * used to define the response model in API Gateway, allowing
   * proper serialization, validation, and documentation.
   *
   * The value can be:
   * - A primitive type (`String`, `Number`, `Boolean`, etc.)
   * - A class decorated with `@Response` to define a structured payload.
   * @example
   * {
   *   response: Number,
   *   // response: Boolean
   *   // response: CustomResponseClass
   * }
   */
  response?: AllowedTypes;
  /**
   * Method authentication configuration.
   *
   * Specifies the authorizer to be applied to this API method.
   *
   * @example
   * {
   *   auth: {
   *     authorizerName: "<example-auth>",
   *     scopes: ["foo", "bar"]
   *   }
   * }
   */
  auth?: MethodAuthorizer | false;
  /**
   * OpenAPI summary.
   *
   * A short summary of the API method. This value is used to populate
   * the `summary` field in the OpenAPI specification for the corresponding
   * operation, providing a brief description of what the endpoint does.
   *
   * @example
   * {
   *   summary: "Retrieve a user by ID"
   * }
   */
  summary?: string;
  /**
   * OpenAPI tags.
   *
   * A list of tags used to group the API method in the OpenAPI specification.
   * Tags help organize endpoints into logical sections when generating
   * API documentation.
   *
   * @example
   * {
   *   tags: ["Users", "Admin"]
   * }
   */
  tags?: string[];
}

export interface ApiIntegrationBaseProps extends ApiLambdaBaseProps {
  additionalServices?: ServicesValues;
}

export interface ApiLambdaIntegrationProps extends ApiLambdaBaseProps {
  /**
   * Method integration type.
   *
   * Indicates whether this API method will use a direct AWS service
   * integration to respond. If this property is not set, the method
   * will use the Lambda function directly as its backend.
   */
  integration?: never;
  /**
   * API Gateway Lambda integration type.
   *
   * Controls how API Gateway invokes the Lambda function backing this method:
   * - `'aws'` (default): a non-proxy integration. API Gateway maps the request
   *   into the shape declared via `@Event(...)` using a VTL request template
   *   before invoking the Lambda, and maps the Lambda result back through the
   *   response templates.
   * - `'aws-proxy'`: a Lambda proxy integration. API Gateway forwards the raw
   *   `APIGatewayProxyEvent` to the Lambda and returns its response verbatim
   *   (no request/response templates). Required for response streaming
   *   (`@Streaming`) and when the handler needs the complete HTTP event via
   *   `@EventProxy(...)`.
   *
   * @default 'aws'
   */
  integrationType?: 'aws' | 'aws-proxy';
  /**
   * Lambda configuration for the method.
   *
   * Specifies the properties and settings of the Lambda function
   * associated with this API method. This allows you to customize
   * aspects such as timeout, memory, runtime, environment variables,
   * services, and tracing on a per-method basis.
   *
   * @example
   * {
   *   timeout: 300,
   *   memory: 1024,
   *   runtime: 22,
   *   services: ['sqs'],
   *   enableTrace: booleam
   * }
   */
  lambda?: LambdaProps;
}

export type BucketIntegrationActions = 'Download' | 'Upload' | 'Delete';

export interface BucketDownloadIntegrationServiceProps extends ApiIntegrationBaseProps {
  /**
   * Method integration type.
   *
   * Indicates whether this API method will use a direct AWS service
   * integration to respond. If this property is not set, the method
   * will use the Lambda function directly as its backend.
   */
  integration: 'bucket';
  /**
   * S3 integration action.
   *
   * Specifies the action that will be performed when using the S3 integration
   * with this API method. Supported actions are:
   * - `'Download'` – retrieves an object from the S3 bucket.
   * - `'Upload'` – uploads an object to the S3 bucket.
   * - `'Delete'` – deletes an object from the S3 bucket.
   */
  action: Extract<BucketIntegrationActions, 'Download'>;
}

export interface BucketUploadDeleteIntegrationServiceProps
  extends Omit<ApiIntegrationBaseProps, 'response'> {
  /**
   * Method integration type.
   *
   * Indicates whether this API method will use a direct AWS service
   * integration to respond. If this property is not set, the method
   * will use the Lambda function directly as its backend.
   */
  integration: 'bucket';
  /**
   * S3 integration action.
   *
   * Specifies the action that will be performed when using the S3 integration
   * with this API method. Supported actions are:
   * - `'Download'` – retrieves an object from the S3 bucket.
   * - `'Upload'` – uploads an object to the S3 bucket.
   * - `'Delete'` – deletes an object from the S3 bucket.
   */
  action: Exclude<BucketIntegrationActions, 'Download'>;
}

export type BucketIntegrationServiceProps =
  | BucketDownloadIntegrationServiceProps
  | BucketUploadDeleteIntegrationServiceProps;

export type StateMachineIntegrationActions = 'Start' | 'Stop' | 'Status';

export interface StateMachineIntegrationServiceProps
  extends Omit<ApiIntegrationBaseProps, 'response'> {
  /**
   * Method integration type.
   *
   * Indicates whether this API method will use a direct AWS service
   * integration to respond. If this property is not set, the method
   * will use the Lambda function directly as its backend.
   */
  integration: 'state-machine';
  /**
   * State Machine integration action.
   *
   * Specifies the action that will be performed when using the State Machine
   * integration with this API method. Supported actions are:
   * - `'Start'` – starts the execution of the state machine.
   * - `'Stop'` – stops a running execution of the state machine.
   * - `'Status'` – retrieves the status of a state machine executi
   */
  action: StateMachineIntegrationActions;
}

export type DynamoDbIntegrationActions = 'Query' | 'Put' | 'Delete';

export interface DynamoDbQueryIntegrationServiceProps extends ApiIntegrationBaseProps {
  /**
   * Method integration type.
   *
   * Indicates whether this API method will use a direct AWS service
   * integration to respond. If this property is not set, the method
   * will use the Lambda function directly as its backend.
   */
  integration: 'dynamodb';
  /**
   * DynamoDB integration action.
   *
   * Specifies the action that will be performed when using the DynamoDB
   * integration with this API method. Supported actions are:
   * - `'Query'` – retrieves items based on a query operation.
   * - `'Put'` – inserts or replaces an item in the table.
   * - `'Delete'` – removes an item from the table.
   */
  action: 'Query';
}

export interface DynamoDbPutDeleteIntegrationServiceProps
  extends Omit<ApiIntegrationBaseProps, 'response'> {
  /**
   * Method integration type.
   *
   * Indicates whether this API method will use a direct AWS service
   * integration to respond. If this property is not set, the method
   * will use the Lambda function directly as its backend.
   */
  integration: 'dynamodb';
  /**
   * DynamoDB integration action.
   *
   * Specifies the action that will be performed when using the DynamoDB
   * integration with this API method. Supported actions are:
   * - `'Query'` – retrieves items based on a query operation.
   * - `'Put'` – inserts or replaces an item in the table.
   * - `'Delete'` – removes an item from the table.
   */
  action: Exclude<DynamoDbIntegrationActions, 'Query'>;
}

export type DynamoDbIntegrationServiceProps =
  | DynamoDbQueryIntegrationServiceProps
  | DynamoDbPutDeleteIntegrationServiceProps;

export type QueueIntegrationActions = 'SendMessage';

export interface QueueIntegrationServiceProps extends ApiIntegrationBaseProps {
  /**
   * Method integration type.
   *
   * Indicates whether this API method will use a direct AWS service
   * integration to respond. If this property is not set, the method
   * will use the Lambda function directly as its backend.
   */
  integration: 'queue';
  /**
   * Queue integration action.
   *
   * Specifies the action that will be performed when using the Queue
   * integration with this API method. Currently, the only supported
   * action is:
   * - `'SendMessage'` – sends a message to the configured queue.
   */
  action: QueueIntegrationActions;
}

export type KinesisIntegrationActions = 'PutRecord';

export interface KinesisIntegrationServiceProps extends ApiIntegrationBaseProps {
  /**
   * Method integration type.
   *
   * Indicates whether this API method will use a direct AWS service
   * integration to respond without Lambda.
   */
  integration: 'kinesis';
  /**
   * Kinesis integration action.
   *
   * Currently the only supported action is:
   * - `'PutRecord'` – puts a single record into the configured stream.
   */
  action: KinesisIntegrationActions;
}

export type EventBridgeIntegrationActions = 'PutEvents';

export interface EventBridgeIntegrationServiceProps extends ApiIntegrationBaseProps {
  /**
   * Method integration type.
   *
   * Indicates whether this API method will use a direct AWS service
   * integration to respond without Lambda.
   */
  integration: 'event-bridge';
  /**
   * EventBridge integration action.
   *
   * Currently the only supported action is:
   * - `'PutEvents'` – publishes one or more events to the configured event bus.
   */
  action: EventBridgeIntegrationActions;
}

export interface MockIntegrationServiceProps extends ApiIntegrationBaseProps {
  /**
   * Method integration type.
   *
   * Indicates whether this API method will use a direct AWS service
   * integration to respond. If this property is not set, the method
   * will use the Lambda function directly as its backend.
   *
   * The `'mock'` integration does not call any backend. Instead, the
   * value returned by the method is transformed into the response
   * template that API Gateway returns directly.
   */
  integration: 'mock';
}

export type ApiLambdaProps =
  | ApiLambdaIntegrationProps
  | BucketIntegrationServiceProps
  | StateMachineIntegrationServiceProps
  | DynamoDbIntegrationServiceProps
  | QueueIntegrationServiceProps
  | KinesisIntegrationServiceProps
  | EventBridgeIntegrationServiceProps
  | MockIntegrationServiceProps;

export interface ApiProps extends ResourceProps {
  /**
   * Api path.
   *
   * Specifies the main path prefix that will be prepended to all
   * methods defined within the decorated class.
   *
   * @default "/"
   */
  path?: string;
  /**
   * Authentication configuration.
   *
   * Specifies the authorizers that will be applied to all methods.
   * Use `false` to disable authorization for all class methods.
   *
   * @example
   * {
   *   auth: {
   *     authorizerName: "<example-auth>",
   *     scopes: ["foo", "bar"]
   *   }
   * }
   */
  auth?: MethodAuthorizer | false;
  /**
   * API Gateway name.
   *
   * Specifies which API Gateway, defined in the resolver, will be used
   * to register the methods of the decorated class. If no value is provided,
   * the default API Gateway will be used.
   */
  apiGatewayName?: ApiNames;
  /**
   * Method settings.
   *
   * Configures API Gateway features (caching, logging, metrics and
   * throttling) for **every method** of this resource class, rendered as
   * `aws_api_gateway_method_settings` resources.
   *
   * Each handler inherits this configuration and receives a concrete method
   * settings entry, e.g. `@Api({ path: '/users' })` can produce
   * `method_path = "users/POST"` and `method_path = "users/{id}/GET"`.
   *
   * Accepts either:
   * - A single settings object, which is applied to **every** stage of the
   *   REST API.
   * - An array of stage-scoped settings, where each entry targets a specific
   *   stage by name.
   *
   * Method-level `methodSettings` take precedence: a handler declaring its own
   * settings does not inherit this class-level configuration.
   *
   * @example
   * {
   *   path: '/users',
   *   methodSettings: {
   *     metricsEnabled: true,
   *     loggingLevel: 'info',
   *   }
   * }
   *
   * @example
   * {
   *   path: '/users',
   *   methodSettings: [
   *     { stageName: 'prod', cachingEnabled: true },
   *     { stageName: 'dev', loggingLevel: 'error' },
   *   ]
   * }
   */
  methodSettings?: MethodSettingsConfig;
  /**
   * OpenAPI tags.
   *
   * A list of tags applied at the class level that will be inherited by all
   * methods defined within the decorated class in the OpenAPI specification.
   * Tags help organize endpoints into logical sections when generating
   * API documentation.
   *
   * @example
   * {
   *   tags: ["Users", "Admin"]
   * }
   */
  tags?: string[];
}

export interface ApiResourceMetadata
  extends Required<Omit<ApiProps, 'bundler'>>,
    ResourceMetadata {}

export interface ApiLambdaMetadata extends LambdaMetadata {
  path: string;
  method: Method;
  name: string;
  integration?: ApiLambdaProps['integration'];
  integrationType?: 'aws' | 'aws-proxy';
  action?: string;
  lambda?: LambdaProps;
  response?: ResponseFieldMetadata;
  auth?: MethodAuthorizer | false;
  summary?: string;
  tags?: string[];
  additionalServices?: ServicesValues;
  methodSettings?: MethodSettingsConfig;
}

export enum Method {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  HEAD = 'HEAD',
  ANY = 'ANY',
}
