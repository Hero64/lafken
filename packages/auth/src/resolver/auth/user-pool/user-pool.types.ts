import type { ClassResource } from '@alicanto/common';

export type SignInAliases = 'email' | 'phone' | 'preferred_username';
export type CognitoPlan = 'lite' | 'essentials' | 'plus';
export type UserVerificationType = 'code' | 'link';
export type AccountRecovery = 'verified_email' | 'verified_phone_number' | 'admin_only';

export type AuthFlow =
  | 'admin_user_password'
  | 'custom'
  | 'user'
  | 'user_password'
  | 'user_srp';
export type OAuthFlow =
  | 'authorization_code_grant'
  | 'client_credentials'
  | 'implicit_code_grant';
export type OAuthScopes =
  | 'cognito_admin'
  | 'email'
  | 'open_id'
  | 'phone'
  | 'profile'
  | {
      name: string;
      description: string;
    };

export type AmazonProviderAttributes = 'email' | 'name' | 'postal_code' | 'user_id';
export type AppleProviderAttributes =
  | 'email'
  | 'email_verified'
  | 'first_name'
  | 'last_name'
  | 'name';

export type FacebookProviderAttributes =
  | 'id'
  | 'email'
  | 'birthday'
  | 'gender'
  | 'id'
  | 'locale'
  | 'middle_name'
  | 'name'
  | 'first_name'
  | 'last_name'
  | 'link'
  | 'website';

export type GoogleProviderAttributes =
  | 'sub'
  | 'name'
  | 'given_name'
  | 'family_name'
  | 'middle_name'
  | 'nickname'
  | 'preferred_username'
  | 'profile'
  | 'picture'
  | 'website'
  | 'email'
  | 'email_verified'
  | 'gender'
  | 'birthdate'
  | 'zoneinfo'
  | 'locale'
  | 'phone_number'
  | 'phone_number_verified'
  | 'address'
  | 'updated_at';

export type AutoVerifyAttributes = Exclude<SignInAliases, 'preferred_username'>;

export interface PasswordPolicy {
  minLength?: number;
  requireDigits?: boolean;
  requireLowercase?: boolean;
  requireSymbols?: boolean;
  requireUppercase?: boolean;
  validityDays?: number;
}

export interface CognitoEmailBase {
  from?: string;
  reply?: string;
}

export interface CognitoEmailAccount extends CognitoEmailBase {
  account?: 'cognito';
}

export interface SesEmailAccount extends CognitoEmailBase {
  account: 'ses';
  arn: string;
  configurationSet?: string;
}

export type EmailConfig = CognitoEmailAccount | SesEmailAccount;

export interface MfaConfigOff {
  status: 'off';
}

export interface MfaConfigOn {
  status: 'optional' | 'required';
  email?: {
    body: string;
    subject: string;
  };
  sms?: string;
  opt?: boolean;
}

export interface InvitationMessage {
  email?: {
    subject: string;
    body: string;
  };
  sms?: string;
}

export interface UserVerification {
  email?: {
    subject: string;
    body: string;
    type: UserVerificationType;
  };
  sms?: string;
}

export type Mfa = MfaConfigOff | MfaConfigOn;

export type IdentityProviderAttributes<T extends Function, A extends string> = Partial<
  Record<keyof T['prototype'], A | (string & {})>
>;

export interface CommonIdentityProvider {
  clientId: string;
  clientSecret: string;
  scopes: string[];
}

export interface AmazonIdentityProvider<T extends Function>
  extends CommonIdentityProvider {
  type: 'amazon';
  attributes: IdentityProviderAttributes<T, AmazonProviderAttributes>;
}

export interface AppleIdentityProvider<T extends Function>
  extends Omit<CommonIdentityProvider, 'clientSecret'> {
  type: 'apple';
  keyId: string;
  teamId: string;
  privateKeyValue: string;
  attributes: IdentityProviderAttributes<T, AppleProviderAttributes>;
}

export interface FacebookIdentityProvider<T extends Function>
  extends CommonIdentityProvider {
  type: 'facebook';
  apiVersion?: string;
  attributes: IdentityProviderAttributes<T, FacebookProviderAttributes>;
}

export interface GoogleIdentityProvider<T extends Function>
  extends CommonIdentityProvider {
  type: 'google';
  attributes: IdentityProviderAttributes<T, GoogleProviderAttributes>;
}

export interface OidcIdentityProvider<T extends Function> extends CommonIdentityProvider {
  type: 'oidc';
  name: string;
  attributes: IdentityProviderAttributes<T, string>;
  attributesRequestMethod: 'GET' | 'POST';
  authorizeUrl: string;
  tokenUrl: string;
  attributesUrl: string;
  jwksUri: string;
}

export type IdentityProvider<T extends ClassResource> =
  | AmazonIdentityProvider<T>
  | AppleIdentityProvider<T>
  | FacebookIdentityProvider<T>
  | GoogleIdentityProvider<T>
  | OidcIdentityProvider<T>;

export interface UserPool<T extends ClassResource> {
  /**
   * Defines the attributes for the Cognito User Pool.
   * Accepts a class decorated with `@Attributes`, where each property can be:
   * - Decorated with `@Standard` to use Cognito's built-in standard attributes, such as email, phone number, or full name.
   * - Decorated with `@Custom` to define custom attributes specific to your application.
   *
   * This allows defining both standard and custom user attributes in a structured way.
   *
   * @example
   * class UserAttributes {
   *   @Standard()
   *   email!: string;
   *
   *   @Custom()
   *   favoriteColor!: string;
   * }
   *
   * const userPoolProps: UserPoolProps = {
   *   attributes: UserAttributes,
   * };
   */
  attributes?: T;
  /**
   *  Defines which identifiers users can use to sign in to the Cognito User Pool.
   * Supported aliases include:
   * - `username`
   * - `email`
   * - `phone_number`
   */
  signInAliases?: SignInAliases[];
  /**
   * Defines the password policy for the Cognito User Pool.
   * This allows configuring rules for user passwords, including:
   * - Minimum length
   * - Requirement for uppercase letters
   * - Requirement for lowercase letters
   * - Requirement for numbers
   * - Requirement for special characters
   */
  passwordPolicy?: PasswordPolicy;
  /**
   *  Defines the account recovery options for the Cognito User Pool.
   * This determines how users can recover their accounts if they forget their password,
   * such as via email, phone, or both.
   *
   * Choosing appropriate recovery options improves user experience and security.
   */
  accountRecovery?: AccountRecovery[];
  /**
   * Defines which attributes Cognito should automatically verify during sign-up.
   * Only attributes such as `email` or `phone` can be auto-verified.
   */
  autoVerifyAttributes?: AutoVerifyAttributes[];
  /**
   * Defines the email configuration for the Cognito User Pool.
   * This includes settings such as the sending method (SES or default),
   * sender email address, and reply-to address.
   * It allows customizing how Cognito sends verification and notification emails.
   */
  email?: EmailConfig;
  /**
   * Defines the Cognito pricing and feature plan for the User Pool.
   */
  cognitoPlan?: CognitoPlan;
  /**
   * Defines the Multi-Factor Authentication (MFA) configuration for the User Pool.
   * MFA adds an extra layer of security by requiring users to provide additional verification,
   * such as a code sent via SMS or an authenticator app.
   */
  mfa?: Mfa;
  /**
   * Defines whether users can register (sign up) themselves into the User Pool
   * without an administrator creating their accounts.
   */
  selfSignUpEnabled?: boolean;
  /**
   *  Defines whether sign-in identifiers (such as username or email)
   * are treated as case-sensitive.
   */
  signInCaseSensitive?: boolean;
  /**
   * Defines the custom invitation message configuration sent to new users
   * when they are created by an admin or imported into the User Pool.
   */
  invitationMessage?: InvitationMessage;
  /**
   *  Defines the messages and methods used to verify a user's account
   * during sign-up in the Cognito User Pool. Verification can be sent via email or SMS.
   */
  userVerification?: UserVerification;
  /**
   * Defines the external identity providers that can be associated with the UserPool.
   * These providers allow users to authenticate using third-party services
   * such as Google, Facebook, Amazon, Apple or OpenID .
   */
  identityProviders?: IdentityProvider<T>[];
}

export interface UserPoolProps extends UserPool<any> {
  extensions?: ClassResource[];
}
