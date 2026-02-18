import type { CognitoUserPool } from '@cdktn/provider-aws/lib/cognito-user-pool';
import type { CognitoUserPoolClient } from '@cdktn/provider-aws/lib/cognito-user-pool-client';
import type { AuthNames, ClassResource } from '@lafken/common';
import type { Construct } from 'constructs';
import type { UserPool } from './auth/user-pool/user-pool.types';
import type { UserClient } from './auth/user-pool-client/user-pool-client.types';

export interface ExtendProps {
  scope: Construct;
  userPool: CognitoUserPool;
  userPoolClient: CognitoUserPoolClient;
}

export interface AuthOptions<T extends ClassResource> {
  /**
   * Determines the name of the Cognito User Pool and its associated User Client.
   */
  name: AuthNames;
  /**
   * Defines a custom configuration for the Cognito User Pool.
   * This allows specifying properties such as:
   * - Password policies
   * - Lambda triggers
   * - MFA settings
   * - Sign-in aliases
   * @example
   * {
   *   userPool: {
   *      attributes: AttributeClass,
   *      ...
   *   }
   * }
   */
  userPool?: UserPool<T>;
  /**
   * Defines a custom configuration for the Cognito User Pool Client.
   * This allows specifying properties such as:
   * - OAuth flows
   * - Callback URLs
   * - Allowed scopes
   * - Token expiration times
   * @example
   * {
   *   userClient: {
   *      authFlow: ['allow_user_auth'],
   *      ...
   *   }
   * }
   */
  userClient?: UserClient<T>;
  /**
   * Defines the list of extensions (triggers) to attach to the Cognito User Pool.
   *
   * This property allows you to add custom logic to different actions performed
   * by the User Pool, such as `preSignUp`, `postConfirmation`, `preAuthentication`, etc.
   *
   * Each extension should be a class decorated with `@AuthExtension`, and its methods
   * must be decorated with `@Trigger`. The `type` of each trigger must be unique
   * to prevent conflicts.
   *
   * @example
   * // first create an extension class with @AuthExtension decorator
   * {
   *   extensions: [PreSignUpClass, PostTokenClass]
   * }
   */
  extensions?: ClassResource[];
  /**
   * Allows extending the Cognito User Pool with custom configurations or resources.
   *
   * @example
   * {
   *   extend: ({ userPool }) => {
   *     userPool.addCustomDomain('auth.myapp.com');
   *   },
   * };
   */
  extend?: (props: ExtendProps) => void;
}
