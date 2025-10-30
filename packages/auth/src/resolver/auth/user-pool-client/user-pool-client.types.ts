import type { CustomAttributesMetadata, StandardAttributeMetadata } from '../../../main';

export type AuthFlow =
  | 'admin_no_srp_auth'
  | 'custom_auth_flow_only'
  | 'user_password_auth'
  | 'allow_admin_user_password_auth'
  | 'allow_custom_auth'
  | 'allow_user_password_auth'
  | 'allow_user_srp_auth'
  | 'allow_refresh_token_auth'
  | 'allow_user_auth';

export type OAuthFlow = 'code' | 'client_credentials' | 'implicit';

export type OAuthScopes =
  | 'aws.cognito.signin.user.admin'
  | 'email'
  | 'openid'
  | 'phone'
  | 'profile'
  | (string & {});

export interface ValidityUnit {
  type: 'seconds' | 'minutes' | 'hours' | 'days';
  value: number;
}

export interface Validity {
  authSession?: number;
  accessToken?: number | ValidityUnit;
  idToken?: number | ValidityUnit;
  refreshToken?: number | ValidityUnit;
}

export interface OAuthConfig {
  callbackUrls?: string[];
  defaultRedirectUri?: string;
  flows?: OAuthFlow[];
  logoutUrls?: string[];
  scopes?: OAuthScopes[];
}

export interface UserClient<T extends Function> {
  /**
   * Defines the authentication flows enabled for the Cognito User Pool Client.
   *
   * This property specifies which authentication mechanisms are allowed
   * when users attempt to sign in. It supports standard, custom, and admin-based
   * authentication flows.
   *
   * Available values include:
   * - `'admin_no_srp_auth'`: Admin-initiated authentication without SRP (Secure Remote Password).
   * - `'custom_auth_flow_only'`: Only allows a custom authentication flow.
   * - `'user_password_auth'`: Standard username and password authentication.
   * - `'allow_admin_user_password_auth'`: Admin can authenticate with username and password.
   * - `'allow_custom_auth'`: Allows custom authentication flows.
   * - `'allow_user_password_auth'`: Users can authenticate with username and password.
   * - `'allow_user_srp_auth'`: Users can authenticate with SRP (Secure Remote Password).
   * - `'allow_refresh_token_auth'`: Enables refreshing authentication tokens.
   * - `'allow_user_auth'`: Enables general user authentication.
   */
  authFlows?: AuthFlow[];
  /**
   * Defines the validity durations for the authentication tokens and sessions
   * of the Cognito User Pool Client.
   *
   * This property allows you to specify how long different elements of the
   * authentication process remain valid before expiring.
   *
   * Available options include:
   * - `authSession`: Duration of the authentication session in seconds.
   * - `accessToken`: Duration of the access token.
   * - `idToken`: Duration of the ID token.
   * - `refreshToken`: Duration of the refresh token.
   */
  validity?: Validity;
  /**
   * Defines whether token revocation is enabled for the Cognito User Pool Client.
   *
   * When set to `true`, it allows tokens (access, ID, and refresh tokens)
   * issued to users to be explicitly revoked before their natural expiration.
   * This enhances security by allowing administrators to invalidate tokens
   * in case of suspicious activity or when a user should no longer have access.
   */
  enableTokenRevocation?: boolean;
  /**
   * Defines whether the Cognito User Pool Client should generate a client secret.
   *
   * When set to `true`, a secret will be generated and associated with the client.
   * This is useful for server-side applications where the client secret can
   * be securely stored and used for authentication flows, such as the
   * client credentials or authorization code flows.
   */
  generateSecret?: boolean;
  /**
   * Defines the OAuth 2.0 configuration for the Cognito User Pool Client.
   *
   * This property allows you to specify how the client interacts with
   * external OAuth flows, including allowed redirect URLs, enabled flows,
   * scopes, and logout URLs.
   *
   * Available options:
   * - `callbackUrls`: An array of URLs where Cognito will redirect after successful authentication.
   * - `defaultRedirectUri`: The default URL used for redirection if none is specified.
   * - `flows`: List of OAuth flows enabled for the client (e.g., authorization code, implicit).
   * - `logoutUrls`: URLs where users are redirected after logging out.
   * - `scopes`: The scopes allowed for this client, defining the access privileges.
   */
  oauth?: OAuthConfig;
  /**
   * Defines whether to prevent user existence errors for the Cognito User Pool Client.
   *
   * When set to `true`, the client will not reveal whether a user exists or not
   * during authentication attempts. This helps to prevent information leakage
   * about registered users, enhancing security against user enumeration attacks
   */
  preventUserExistenceErrors?: boolean;
  /**
   * Defines which attributes of the Cognito User Pool Client are readable.
   *
   * This property allows you to specify a list of attribute names that
   * can be accessed by the client. Only the attributes included in this
   * list will be returned when querying user information.
   */
  readAttributes?: (keyof T['prototype'])[];
  /**
   * Defines which attributes of the Cognito User Pool Client are writable.
   *
   * This property allows you to specify a list of attribute names that
   * the client is allowed to modify. Only the attributes included in this
   * list can be updated through client operations.
   */
  writeAttributes?: (keyof T['prototype'])[];
  /**
   * Defines the grace period (in seconds) for refresh token rotation in the Cognito User Pool Client.
   *
   * When refresh token rotation is enabled, a new refresh token is issued each time
   * the user uses an existing refresh token. This property sets a grace period during
   * which both the old and new refresh tokens are valid, allowing smooth token rotation
   * without immediately invalidating active sessions.
   */
  refreshTokenRotationGracePeriod?: number;
}

export interface UserPoolClientProps extends UserClient<any> {
  userPoolId: string;
  attributeByName: Record<string, CustomAttributesMetadata | StandardAttributeMetadata>;
}
