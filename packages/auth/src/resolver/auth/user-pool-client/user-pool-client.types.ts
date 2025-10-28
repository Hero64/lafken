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
  authFlows?: AuthFlow[];
  validity?: Validity;
  enableTokenRevocation?: boolean;
  generateSecret?: boolean;
  oauth?: OAuthConfig;
  preventUserExistenceErrors?: boolean;
  readAttributes?: (keyof T['prototype'])[];
  writeAttributes?: (keyof T['prototype'])[];
  refreshTokenRotationGracePeriod?: number;
}

export interface UserPoolClientProps extends UserClient<any> {
  userPoolId: string;
  attributeByName: Record<string, CustomAttributesMetadata | StandardAttributeMetadata>;
}
