import type { GetResourceValue } from './output.types';
import type {
  ApiRestScopedNames,
  AuthScopedNames,
  BucketScopedNames,
  DynamoTableScopedNames,
  EventBusScopedNames,
  QueueScopedNames,
  StateMachineScopedNames,
} from './override-resources.types';

export interface ClassResource {
  new (...args: any[]): {};
}

export interface GetResourceProps {
  /**
   * Retrieves an attribute value from a resource created by Lafken.
   *
   * Uses the format `'scope::resourceName'` to identify the resource,
   * where `scope` corresponds to the resource type prefix (e.g., `dynamo`, `bucket`,
   * `api`, `auth`, `event-bus`) or the module name (for queues and state machines).
   *
   * The second argument specifies the attribute to retrieve. Available attributes
   * depend on the resource type and correspond to the Terraform registry attribute
   * reference for each AWS resource.
   *
   * @param value - Resource identifier in `'scope::resourceName'` format.
   * @param type - Attribute to retrieve (`'arn'` or `'id'`).
   *
   * @example
   * // Get a DynamoDB table ID
   * getResourceValue('dynamo::users', 'id')
   *
   * @example
   * // Get a queue ARN
   * getResourceValue('orders-module::queue::processOrder', 'id')
   *
   * @example
   * // Get a bucket ARN
   * getResourceValue('bucket::uploads', 'arn')
   */
  getResourceValue: GetResourceValue<
    | DynamoTableScopedNames
    | AuthScopedNames
    | BucketScopedNames
    | ApiRestScopedNames
    | EventBusScopedNames
    | StateMachineScopedNames
    | QueueScopedNames
  >;
  /**
   * Retrieves a value from AWS Systems Manager Parameter Store.
   *
   * Resolves SSM parameter references at deployment time, allowing
   * access to configuration values stored in Parameter Store.
   *
   * @param value - The SSM parameter path (e.g., `'/my-app/database-url'`).
   * @param secure - When `true`, retrieves the parameter as a `SecureString`.
   *
   * @example
   * // Get a plain text parameter
   * getSSMValue('/my-app/api-key')
   *
   * @example
   * // Get a secure parameter
   * getSSMValue('/my-app/secret', true)
   */
  getSSMValue: (value: string, secure?: boolean) => string;
}
