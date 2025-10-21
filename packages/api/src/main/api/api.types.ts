import type {
  AllowedTypes,
  ApiAuthorizerNames,
  ApiRestNames,
  LambdaMetadata,
  LambdaProps,
  ResourceMetadata,
  ResourceProps,
} from '@alicanto/common';
import type { ResponseMetadata } from '../event';
import type {
  ApiArrayField,
  ApiBooleanField,
  ApiNumberField,
  ApiObjectField,
  ApiStringField,
} from '../field';

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
   *   permissions: ["read:user", "write:user"]
   * }
   */
  scopes?: string[];
}

export interface ApiLambdaBaseProps {
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
   */
  response?: AllowedTypes;
  /**
   * Method authentication configuration.
   *
   * Specifies the authorizer to be applied to this API method.
   */
  auth?: MethodAuthorizer | false;
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
   * Lambda configuration for the method.
   *
   * Specifies the properties and settings of the Lambda function
   * associated with this API method. This allows you to customize
   * aspects such as timeout, memory, runtime, environment variables,
   * services, and tracing on a per-method basis.
   */
  lambda?: LambdaProps;
}

export type BucketIntegrationActions = 'Download' | 'Upload' | 'Delete';

export interface BucketDownloadIntegrationServiceProps extends ApiLambdaBaseProps {
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
  extends Omit<ApiLambdaBaseProps, 'response'> {
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
  extends Omit<ApiLambdaBaseProps, 'response'> {
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

export interface DynamoDbQueryIntegrationServiceProps extends ApiLambdaBaseProps {
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
  extends Omit<ApiLambdaBaseProps, 'response'> {
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

export interface QueueIntegrationServiceProps
  extends Omit<ApiLambdaBaseProps, 'response'> {
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

export type ApiLambdaProps =
  | ApiLambdaIntegrationProps
  | BucketIntegrationServiceProps
  | StateMachineIntegrationServiceProps
  | DynamoDbIntegrationServiceProps
  | QueueIntegrationServiceProps;

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
   */
  auth?: MethodAuthorizer | false;
  /**
   * API Gateway name.
   *
   * Specifies which API Gateway, defined in the resolver, will be used
   * to register the methods of the decorated class. If no value is provided,
   * the default API Gateway will be used.
   */
  apiGatewayName?: ApiRestNames;
}

export interface ApiResourceMetadata extends Required<ApiProps>, ResourceMetadata {}

export type ResponseFieldMetadata =
  | ApiStringField
  | ApiNumberField
  | ApiBooleanField
  | ResponseApiObjectField
  | ResponseApiArrayField;

export interface ResponseApiObjectField
  extends Omit<ApiObjectField, 'properties' | 'payload'> {
  properties: ResponseFieldMetadata[];
  payload: ResponseMetadata;
}
export interface ResponseApiArrayField extends Omit<ApiArrayField, 'items'> {
  items: ResponseFieldMetadata;
}

export interface ApiLambdaMetadata extends LambdaMetadata {
  path: string;
  method: Method;
  name: string;
  integration?: ApiLambdaProps['integration'];
  action?: string;
  lambda?: LambdaProps;
  response?: ResponseFieldMetadata;
  auth?: MethodAuthorizer | false;
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
