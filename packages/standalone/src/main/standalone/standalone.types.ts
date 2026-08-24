import type {
  GetResourceProps,
  LambdaMetadata,
  LambdaProps,
  LambdaReferenceNames,
  ServicesValues,
} from '@lafken/common';

export const RESOURCE_TYPE = 'standalone';

export interface HandlerProps {
  /**
   * The logical name used to identify this Lambda handler within the stack.
   * Defaults to the method name if not provided.
   *
   * @example
   * name: 'myHandler'
   */
  name?: string;

  /**
   * Description of the Lambda function. Propagated to the function's resource
   * description.
   *
   * @example
   * description: 'Processes incoming orders'
   */
  description?: string;

  /**
   * Configures how other principals are allowed to invoke this Lambda.
   *
   * - `permission` — grants a service principal direct invoke permission through
   *   a resource-based policy (the usual mechanism for push-based invokers like
   *   API Gateway, EventBridge or SNS).
   * - `role` — creates a dedicated IAM role another principal can assume to
   *   obtain `lambda:InvokeFunction` on this function (caller-side, identity-based
   *   access such as API Gateway integration credentials or cross-account calls).
   *
   * @example
   * invoke: {
   *   permission: {
   *     principal: 'apigateway.amazonaws.com',
   *     sourceArn: (props) => props.getResourceValue('api::orders', 'arn'),
   *   },
   *   role: {
   *     principal: 'apigateway.amazonaws.com',
   *     services: [{ type: 'lambda', permissions: ['InvokeFunction'], resources: ['*'] }],
   *     ref: 'myHandlerInvokeRole',
   *   },
   * }
   */
  invoke?: InvokeConfig;

  lambda?: Omit<LambdaProps, 'ref'>;

  /**
   * Registers this Lambda function as a named global reference, allowing other
   * resources to access its attributes (e.g. ARN, function name) by reference name.
   *
   * @example
   * ref: 'myHandler'
   */
  ref?: LambdaReferenceNames;
}

export interface InvokeConfig {
  /**
   * Grants a service principal permission to invoke this Lambda directly through
   * a resource-based policy (equivalent to `aws lambda add-permission`). This is
   * the usual mechanism for push-based invokers such as API Gateway, EventBridge
   * or SNS.
   */
  permission?: InvokePermission;

  /**
   * Creates a dedicated IAM role that another principal can assume to obtain
   * `lambda:InvokeFunction` on this function. Used for caller-side, identity-based
   * access (e.g. API Gateway integration credentials or cross-account callers).
   */
  role?: InvokeRole;
}

export interface InvokePermission {
  /**
   * Service principal allowed to invoke the function
   * (e.g. `'apigateway.amazonaws.com'`).
   */
  principal: string;

  /**
   * Restricts invocation to a specific source ARN. Accepts either a literal
   * string or a resolver callback `(props: GetResourceProps) => string` used to
   * reference another Lafken resource's ARN.
   *
   * @example
   * sourceArn: (props) => props.getResourceValue('api::orders', 'arn')
   */
  sourceArn?: string | ((props: GetResourceProps) => string);

  /**
   * Restricts invocation to a specific source AWS account.
   */
  sourceAccount?: string;
}

export interface InvokeRole {
  /**
   * Trust principal allowed to assume the invoke role
   * (e.g. `'apigateway.amazonaws.com'`).
   */
  principal: string;

  /**
   * Additional IAM policy statements to attach to the role.
   */
  services?: ServicesValues;

  /**
   * Registers the created invoke role as a named global reference so other
   * resources can look it up by name.
   */
  ref?: string;
}

export interface HandlerMetadata
  extends Omit<HandlerProps, 'name'>,
    Omit<LambdaMetadata, 'lambda'> {}
