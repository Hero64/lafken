import type { LambdaMetadata, LambdaProps, ResourceMetadata } from '@lafken/common';

/**
 * Supported Cognito User Pool trigger types.
 *
 * Each value corresponds to a lifecycle event that Cognito can invoke
 * a Lambda function for during user authentication and management flows.
 */
export type TriggerType =
  | 'preAuthentication'
  | 'preSignUp'
  | 'preTokenGeneration'
  | 'preTokenGenerationConfig'
  | 'userMigration'
  | 'postAuthentication'
  | 'postConfirmation'
  | 'createAuthChallenge'
  | 'defineAuthChallenge'
  | 'customMessage'
  | 'customEmailSender'
  | 'customSmsSender'
  | 'verifyAuthChallengeResponse';

/**
 * Configuration options for the `@AuthExtension` class decorator.
 */
export interface ExtensionsProps {
  /**
   * A custom name for the authentication extension resource.
   * If omitted, the class name is used by default.
   */
  name?: string;
}

export interface ExtensionsMetadata extends ResourceMetadata {}

/**
 * Configuration options for the `@Trigger` method decorator.
 */
export interface TriggerProps {
  /**
   * Optional Lambda function settings applied to the trigger handler
   * (e.g. memory, timeout, runtime, environment variables).
   */
  lambda?: LambdaProps;
  /**
   * The Cognito User Pool trigger type this handler responds to.
   */
  type: TriggerType;
}

export interface TriggerMetadata extends LambdaMetadata {
  type: TriggerType;
}
