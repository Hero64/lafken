import type { CognitoUserPool } from '@cdktn/provider-aws/lib/cognito-user-pool';
import type { CognitoUserPoolClient } from '@cdktn/provider-aws/lib/cognito-user-pool-client';
import type { DataAwsCognitoUserPool } from '@cdktn/provider-aws/lib/data-aws-cognito-user-pool';
import type { DataAwsCognitoUserPoolClient } from '@cdktn/provider-aws/lib/data-aws-cognito-user-pool-client';
import type { ClassResource } from '@lafken/common';
import type { Construct } from 'constructs';
import type { UserPoolProps } from './auth/user-pool/user-pool.types';
import type { UserClientProps } from './auth/user-pool-client/user-pool-client.types';

export interface ExtendProps {
  scope: Construct;
  userPool: CognitoUserPool | DataAwsCognitoUserPool;
  userPoolClient?: CognitoUserPoolClient | DataAwsCognitoUserPoolClient;
}

export interface AuthOptions<T extends ClassResource> {
  /**
   * name of authorizer
   */
  name: string;
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
  userPool?: UserPoolProps<T>;
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
  userClient?: UserClientProps<T>;

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
