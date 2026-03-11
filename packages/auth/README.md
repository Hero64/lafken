# @lafken/auth

Define and manage Amazon Cognito User Pools using TypeScript decorators. `@lafken/auth` lets you configure authentication flows, password policies, user attributes, MFA, identity providers, and Lambda triggers — all from a single resolver configuration.

## Installation

```bash
npm install @lafken/auth
```

## Getting Started

Configure `AuthResolver` with your User Pool settings, define attributes with `@Attributes`, and add Lambda triggers with `@AuthExtension`:

```typescript
import { createApp } from '@lafken/main';
import { AuthResolver } from '@lafken/auth/resolver';
import { Attributes, Standard, Custom } from '@lafken/auth/main';
import { AuthExtension, Trigger, Event } from '@lafken/auth/main';

// 1. Define user attributes
@Attributes()
export class UserAttributes {
  @Standard({ required: true })
  email: string;

  @Standard({ required: false })
  phoneNumber: string;

  @Custom({ minLen: 2, maxLen: 50 })
  displayName: string;
}

// 2. Define Lambda triggers
@AuthExtension()
export class AuthTriggers {
  @Trigger({ type: 'preSignUp' })
  validateSignUp(@Event() event: any) {
    return event;
  }
}

// 3. Register in the app
createApp({
  name: 'my-app',
  resolvers: [
    new AuthResolver({
      name: 'app-auth',
      userPool: {
        attributes: UserAttributes,
        selfSignUpEnabled: true,
        signInAliases: ['email'],
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireDigits: true,
        },
      },
      userClient: {
        authFlows: ['allow_user_password_auth', 'allow_refresh_token_auth'],
      },
      extensions: [AuthTriggers],
    }),
  ],
});
```

## Features

### User Pool

Configure the Cognito User Pool through the `userPool` option in `AuthResolver`:

```typescript
new AuthResolver({
  name: 'customer-auth',
  userPool: {
    selfSignUpEnabled: true,
    signInAliases: ['email', 'phone'],
    usernameAttributes: ['email'],
    autoVerifyAttributes: ['email'],
    signInCaseSensitive: false,
    cognitoPlan: 'essentials',
  },
});
```

#### User Pool Options

| Option                 | Type                     | Description                                                  |
| ---------------------- | ------------------------ | ------------------------------------------------------------ |
| `attributes`           | `ClassResource`          | Class decorated with `@Attributes` defining user schema      |
| `selfSignUpEnabled`    | `boolean`                | Allow users to sign up without admin intervention             |
| `signInAliases`        | `SignInAliases[]`        | Identifiers for sign-in: `'email'`, `'phone'`, `'preferred_username'` |
| `usernameAttributes`   | `string[]`               | Attributes that can be used as the username                  |
| `autoVerifyAttributes` | `string[]`               | Attributes to auto-verify during sign-up (`'email'`, `'phone'`) |
| `signInCaseSensitive`  | `boolean`                | Whether sign-in identifiers are case-sensitive               |
| `cognitoPlan`          | `CognitoPlan`            | Pricing plan: `'lite'`, `'essentials'`, `'plus'`             |
| `passwordPolicy`       | `PasswordPolicy`         | Password strength requirements                               |
| `accountRecovery`      | `AccountRecovery[]`      | Recovery methods: `'verified_email'`, `'verified_phone_number'`, `'admin_only'` |
| `email`                | `EmailConfig`            | Email sending configuration (Cognito or SES)                 |
| `mfa`                  | `Mfa`                    | Multi-factor authentication settings                         |
| `invitationMessage`    | `InvitationMessage`      | Custom message for admin-created users                       |
| `userVerification`     | `UserVerification`       | Verification message and method configuration                |
| `identityProviders`    | `IdentityProvider[]`     | External identity providers (Google, Facebook, etc.)         |

### Password Policy

Control password strength requirements:

```typescript
userPool: {
  passwordPolicy: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireDigits: true,
    requireSymbols: true,
    validityDays: 90,
  },
}
```

| Option             | Type      | Description                                    |
| ------------------ | --------- | ---------------------------------------------- |
| `minLength`        | `number`  | Minimum password length                        |
| `requireUppercase` | `boolean` | Require at least one uppercase letter          |
| `requireLowercase` | `boolean` | Require at least one lowercase letter          |
| `requireDigits`    | `boolean` | Require at least one digit                     |
| `requireSymbols`   | `boolean` | Require at least one special character         |
| `validityDays`     | `number`  | Number of days before password expires         |

### User Attributes

Define the User Pool schema using a class decorated with `@Attributes`. Properties use `@Standard` for built-in Cognito attributes and `@Custom` for application-specific fields:

```typescript
import { Attributes, Standard, Custom } from '@lafken/auth/main';

@Attributes()
export class UserAttributes {
  @Standard({ required: true })
  email: string;

  @Standard({ required: false, mutable: true })
  nickname: string;

  @Custom({ minLen: 2, maxLen: 100 })
  displayName: string;

  @Custom({ min: 0, max: 999 })
  score: number;

  @Custom({ mutable: false })
  isVerified: boolean;
}
```

#### Standard Attributes

Predefined Cognito attributes following the OpenID Connect specification. Supported names:

`name`, `familyName`, `givenName`, `middleName`, `nickname`, `preferredUsername`, `profile`, `picture`, `website`, `gender`, `birthdate`, `zoneInfo`, `locale`, `updated_at`, `address`, `email`, `phoneNumber`, `sub`

| Option     | Type      | Default | Description                                      |
| ---------- | --------- | ------- | ------------------------------------------------ |
| `required` | `boolean` | `true`  | Whether the attribute is required during sign-up |
| `mutable`  | `boolean` | `true`  | Whether the value can be changed after creation  |

#### Custom Attributes

Application-specific fields with type-aware constraints:

| Type      | Options                | Description                           |
| --------- | ---------------------- | ------------------------------------- |
| `string`  | `minLen`, `maxLen`     | String length constraints             |
| `number`  | `min`, `max`           | Numeric range constraints             |
| `boolean` | `mutable`              | Mutability only                       |

All custom attributes default to `mutable: true`.

### MFA (Multi-Factor Authentication)

Configure MFA for the User Pool:

```typescript
userPool: {
  mfa: {
    status: 'required',
    email: {
      subject: 'Your verification code',
      body: 'Your code is {####}',
    },
    sms: 'Your verification code is {####}',
    opt: true,
  },
}
```

| Option   | Type                            | Description                                         |
| -------- | ------------------------------- | --------------------------------------------------- |
| `status` | `'off' \| 'optional' \| 'required'` | MFA enforcement level                          |
| `email`  | `{ subject, body }`            | Email-based MFA message template                    |
| `sms`    | `string`                       | SMS-based MFA message template                      |
| `opt`    | `boolean`                      | Enable TOTP (authenticator app) as an MFA option    |

### Email Configuration

Configure how Cognito sends verification and notification emails:

```typescript
// Using the default Cognito email service
userPool: {
  email: {
    from: 'noreply@example.com',
    reply: 'support@example.com',
  },
}

// Using Amazon SES
userPool: {
  email: {
    account: 'ses',
    arn: 'arn:aws:ses:us-east-1:123456789:identity/example.com',
    from: 'auth@example.com',
    configurationSet: 'my-ses-config',
  },
}
```

### Verification & Invitation Messages

Customize messages sent during user verification and admin-created user invitations:

```typescript
userPool: {
  userVerification: {
    email: {
      subject: 'Verify your account',
      body: 'Click this link to verify: {##Verify##}',
      type: 'link',
    },
    sms: 'Your verification code is {####}',
  },
  invitationMessage: {
    email: {
      subject: 'Welcome to our platform',
      body: 'Your username is {username} and temporary password is {####}',
    },
    sms: 'Your username is {username} and password is {####}',
  },
}
```

### Identity Providers

Configure external identity providers so users can sign in with third-party accounts:

#### Google

```typescript
userPool: {
  identityProviders: [
    {
      type: 'google',
      clientId: 'google-client-id',
      clientSecret: 'google-client-secret',
      scopes: ['openid', 'email', 'profile'],
      attributes: {
        email: 'email',
        displayName: 'name',
      },
    },
  ],
}
```

#### Facebook

```typescript
{
  type: 'facebook',
  clientId: 'fb-app-id',
  clientSecret: 'fb-app-secret',
  scopes: ['public_profile', 'email'],
  apiVersion: 'v18.0',
  attributes: {
    email: 'email',
    displayName: 'name',
  },
}
```

#### Apple

```typescript
{
  type: 'apple',
  clientId: 'apple-service-id',
  scopes: ['email', 'name'],
  keyId: 'key-id',
  teamId: 'team-id',
  privateKeyValue: '-----BEGIN PRIVATE KEY-----...',
  attributes: {
    email: 'email',
    displayName: 'first_name',
  },
}
```

#### Amazon

```typescript
{
  type: 'amazon',
  clientId: 'amazon-client-id',
  clientSecret: 'amazon-client-secret',
  scopes: ['profile'],
  attributes: {
    email: 'email',
    displayName: 'name',
  },
}
```

#### OIDC (OpenID Connect)

```typescript
{
  type: 'oidc',
  name: 'my-oidc-provider',
  clientId: 'oidc-client-id',
  clientSecret: 'oidc-client-secret',
  scopes: ['openid', 'email'],
  attributesRequestMethod: 'GET',
  authorizeUrl: 'https://provider.com/authorize',
  tokenUrl: 'https://provider.com/token',
  attributesUrl: 'https://provider.com/userinfo',
  jwksUri: 'https://provider.com/.well-known/jwks.json',
  attributes: {
    email: 'email',
  },
}
```

Attribute mappings map your `@Attributes` class properties to the provider's attribute names.

### User Pool Client

Configure the Cognito User Pool Client through the `userClient` option:

```typescript
new AuthResolver({
  name: 'app-auth',
  userClient: {
    authFlows: ['allow_user_password_auth', 'allow_refresh_token_auth'],
    generateSecret: false,
    preventUserExistenceErrors: true,
    enableTokenRevocation: true,
    validity: {
      accessToken: { type: 'hours', value: 1 },
      idToken: { type: 'hours', value: 1 },
      refreshToken: { type: 'days', value: 30 },
      authSession: 300,
    },
    readAttributes: ['email', 'displayName'],
    writeAttributes: ['displayName', 'nickname'],
  },
});
```

#### Auth Flows

| Flow                            | Description                                  |
| ------------------------------- | -------------------------------------------- |
| `allow_user_password_auth`      | Username and password authentication         |
| `allow_user_srp_auth`           | Secure Remote Password authentication        |
| `allow_admin_user_password_auth`| Admin-initiated password authentication      |
| `allow_custom_auth`             | Custom authentication flow                   |
| `allow_refresh_token_auth`      | Token refresh flow                           |
| `allow_user_auth`               | General user authentication                  |

#### OAuth Configuration

```typescript
userClient: {
  oauth: {
    flows: ['code'],
    scopes: ['openid', 'email', 'profile'],
    callbackUrls: ['https://app.example.com/callback'],
    logoutUrls: ['https://app.example.com/logout'],
    defaultRedirectUri: 'https://app.example.com/callback',
  },
}
```

| Option               | Type           | Description                              |
| -------------------- | -------------- | ---------------------------------------- |
| `flows`              | `OAuthFlow[]`  | `'code'`, `'implicit'`, `'client_credentials'` |
| `scopes`             | `string[]`     | OAuth scopes (e.g. `'openid'`, `'email'`, `'profile'`) |
| `callbackUrls`       | `string[]`     | Allowed redirect URLs after sign-in      |
| `logoutUrls`         | `string[]`     | Allowed redirect URLs after sign-out     |
| `defaultRedirectUri` | `string`       | Default redirect URL                     |

#### Token Validity

```typescript
validity: {
  authSession: 300,
  accessToken: { type: 'minutes', value: 60 },
  idToken: { type: 'minutes', value: 60 },
  refreshToken: { type: 'days', value: 30 },
}
```

`accessToken`, `idToken`, and `refreshToken` accept either a number (in minutes) or a `ValidityUnit` object with `type` (`'seconds'`, `'minutes'`, `'hours'`, `'days'`) and `value`.

### Extensions (Lambda Triggers)

Extend Cognito behavior with Lambda triggers. Define an extension class with `@AuthExtension` and add `@Trigger` methods for each lifecycle event:

```typescript
import { AuthExtension, Trigger, Event } from '@lafken/auth/main';

@AuthExtension()
export class AuthTriggers {
  @Trigger({ type: 'preSignUp' })
  validateSignUp(@Event() event: any) {
    // Auto-confirm or reject users
    event.response.autoConfirmUser = true;
    return event;
  }

  @Trigger({ type: 'postConfirmation' })
  onConfirmed(@Event() event: any) {
    // Create user profile in database
    return event;
  }

  @Trigger({ type: 'customMessage' })
  customizeMessage(@Event() event: any) {
    // Customize verification emails
    return event;
  }
}
```

Register extensions in the resolver:

```typescript
new AuthResolver({
  name: 'app-auth',
  extensions: [AuthTriggers],
});
```

#### Available Trigger Types

| Trigger                        | Description                                         |
| ------------------------------ | --------------------------------------------------- |
| `preSignUp`                    | Validate or modify sign-up data before registration |
| `preAuthentication`            | Run logic before authentication completes           |
| `preTokenGeneration`           | Customize token claims before token issuance        |
| `preTokenGenerationConfig`     | Configure token generation settings                 |
| `postAuthentication`           | Run logic after successful authentication           |
| `postConfirmation`             | Run logic after user account confirmation           |
| `userMigration`                | Migrate users from an external system on sign-in    |
| `createAuthChallenge`          | Create a custom authentication challenge            |
| `defineAuthChallenge`          | Define the flow of custom authentication challenges |
| `verifyAuthChallengeResponse`  | Verify the response to a custom challenge           |
| `customMessage`                | Customize verification and MFA messages             |
| `customEmailSender`            | Custom email delivery logic                         |
| `customSmsSender`              | Custom SMS delivery logic                           |

Each trigger method can accept a `lambda` option for custom Lambda settings:

```typescript
@Trigger({ type: 'preSignUp', lambda: { memory: 512, timeout: 30 } })
validateSignUp(@Event() event: any) { }
```

### Extending the Auth Stack

Use the `extend` callback to access underlying CDKTN resources and apply advanced configuration:

```typescript
new AuthResolver({
  name: 'app-auth',
  extend: ({ userPool, userPoolClient, scope }) => {
    // Add custom domains, resource servers, or any CDKTN construct
  },
});
```
