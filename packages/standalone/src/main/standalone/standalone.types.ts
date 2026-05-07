import type { LambdaMetadata, LambdaProps, ServicesValues } from '@lafken/common';

export const RESOURCE_TYPE = 'standalone';

export interface HandlerProps {
  /**
   * The logical name used to identify this Lambda handler within the stack.
   * Defaults to the function's file or export name if not provided.
   *
   * @example
   * name: 'myHandler'
   */
  name?: string;

  /**
   * Configures an IAM role that grants another principal permission to invoke
   * this Lambda function. When provided, a dedicated invoke role is created and
   * attached to the function.
   *
   * - `principal` — the AWS service or account ARN allowed to assume the role
   *   (e.g. `'apigateway.amazonaws.com'`).
   * - `services` — additional IAM policy statements to include in the role.
   * - `roleRef` — registers the created role as a named global reference so
   *   other resources can look it up by name.
   *
   * @example
   * invocator: {
   *   principal: 'apigateway.amazonaws.com',
   *   services: [{ type: 'lambda', permissions: ['InvokeFunction'], resources: ['*'] }],
   *   roleRef: 'myHandlerInvokeRole',
   * }
   */
  invocator?: {
    principal: string;
    services: ServicesValues;
    roleRef?: string;
  };

  lambda?: LambdaProps;

  /**
   * Registers this Lambda function as a named global reference, allowing other
   * resources to access its attributes (e.g. ARN, function name) by reference name.
   *
   * @example
   * ref: 'myHandler'
   */
  ref?: string;
}

export interface HandlerMetadata extends Omit<HandlerProps, 'name'>, LambdaMetadata {}
