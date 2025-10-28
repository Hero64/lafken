import { unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { enableBuildEnvVariable } from '@alicanto/common';
import { setupTestApp } from '@alicanto/resolver';
import { Template } from 'aws-cdk-lib/assertions';
import { Attributes, Custom, Standard } from '../main';
import { AuthExtension, Trigger } from '../main/extension/extension';
import { AuthResolver } from './resolver';

describe('Auth resolver', () => {
  enableBuildEnvVariable();
  const getResourceConfig = () => {
    const { stack, nestedStack } = setupTestApp();

    return {
      stack,
      nestedStack,
      config: {
        scope: stack,
        env: {},
        lambdaGlobalConfig: {},
        name: 'test-app',
      },
    };
  };

  describe('beforeCreate', () => {
    it('should create auth resources', async () => {
      const { stack, config } = getResourceConfig();

      const resolver = new AuthResolver({
        name: 'test',
      });

      await resolver.beforeCreate(config);

      Template.fromStack(stack).hasResource('AWS::Cognito::UserPool', {});
      Template.fromStack(stack).hasResource('AWS::Cognito::UserPoolClient', {});
    });

    it('should create auth resources with attributes', async () => {
      const { stack, config } = getResourceConfig();

      @Attributes()
      class AuthAttributes {
        @Standard()
        email: string;

        @Custom({
          maxLen: 100,
          minLen: 10,
          mutable: false,
        })
        customValue: string;
      }

      const resolver = new AuthResolver({
        name: 'test',
        userPool: {
          attributes: AuthAttributes,
        },
        userClient: {
          readAttributes: ['email', 'customValue'],
          writeAttributes: ['customValue'],
        },
      });

      await resolver.beforeCreate(config);
      Template.fromStack(stack).hasResource('AWS::Cognito::UserPool', {
        Properties: {
          Schema: [
            {
              Mutable: true,
              Name: 'email',
              Required: false,
            },
            {
              AttributeDataType: 'String',
              Mutable: false,
              Name: 'customValue',
              StringAttributeConstraints: {
                MaxLength: '100',
                MinLength: '10',
              },
            },
          ],
        },
      });
      Template.fromStack(stack).hasResource('AWS::Cognito::UserPoolClient', {
        Properties: {
          ReadAttributes: ['custom:customValue', 'email'],
          WriteAttributes: ['custom:customValue'],
        },
      });
    });

    it('should create auth resources with identity providers', async () => {
      const { stack, config } = getResourceConfig();

      @Attributes()
      class AuthAttributes {
        @Standard()
        email: string;

        @Standard()
        fullname: string;
      }

      const resolver = new AuthResolver({
        name: 'test',
        userPool: {
          attributes: AuthAttributes,
          identityProviders: [
            {
              type: 'google',
              attributes: {
                email: 'email',
                fullname: 'name',
              },
              clientId: 'id',
              clientSecret: 'secret',
              scopes: ['email'],
            },
          ],
        },
      });

      await resolver.beforeCreate(config);

      Template.fromStack(stack).hasResource('AWS::Cognito::UserPoolClient', {
        Properties: {
          SupportedIdentityProviders: ['COGNITO', 'Google'],
        },
      });

      Template.fromStack(stack).hasResource('AWS::Cognito::UserPoolIdentityProvider', {
        Properties: {
          AttributeMapping: {
            email: 'email',
            name: 'name',
          },
          ProviderDetails: {
            client_id: 'id',
            client_secret: 'secret',
            authorize_scopes: 'email',
          },
          ProviderName: 'Google',
          ProviderType: 'Google',
        },
      });
    });

    it('should create auth resources with custom properties', async () => {
      const { stack, config } = getResourceConfig();

      const resolver = new AuthResolver({
        name: 'test',
        userPool: {
          accountRecovery: 'none',
          autoVerify: ['email'],
          cognitoPlan: 'essentials',
          email: {
            fromEmail: 'test@test.com',
            fromName: 'test',
            replyTo: 'foo@test.com',
            sesRegion: 'a',
          },
          mfa: {
            secondFactor: ['sms'],
            status: 'optional',
            smsMessage: 'this is example sms {####}',
          },
          invitationMessage: {
            email: {
              body: 'test',
              subject: 'test',
            },
            sms: 'invitation sms',
          },
          passwordPolicy: {
            requireLowercase: false,
            minLength: 10,
            validityDays: 2,
          },
          signInAliases: ['email', 'phone'],
          signInCaseSensitive: true,
          userVerification: {
            email: {
              body: 'verification test {####}',
              subject: 'test',
              type: 'code',
            },
            sms: 'verification sms {####}',
          },
          selfSignUpEnabled: false,
        },
      });

      await resolver.beforeCreate(config);
      Template.fromStack(stack).hasResource('AWS::Cognito::UserPool', {
        Properties: {
          AccountRecoverySetting: {
            RecoveryMechanisms: [
              {
                Name: 'admin_only',
                Priority: 1,
              },
            ],
          },
          AdminCreateUserConfig: {
            AllowAdminCreateUserOnly: true,
            InviteMessageTemplate: {
              EmailMessage: 'test',
              EmailSubject: 'test',
              SMSMessage: 'invitation sms',
            },
          },
          AutoVerifiedAttributes: ['email'],
          EmailConfiguration: {
            EmailSendingAccount: 'DEVELOPER',
            From: 'test <test@test.com>',
            ReplyToEmailAddress: 'foo@test.com',
          },
          EmailVerificationMessage: 'verification test {####}',
          EmailVerificationSubject: 'test',
          EnabledMfas: ['SMS_MFA'],
          MfaConfiguration: 'OPTIONAL',
          Policies: {
            PasswordPolicy: {
              MinimumLength: 10,
              RequireLowercase: false,
              TemporaryPasswordValidityDays: 2,
            },
          },
          SmsAuthenticationMessage: 'this is example sms {####}',
          SmsVerificationMessage: 'verification sms {####}',
          UserPoolName: 'test',
          UserPoolTier: 'ESSENTIALS',
          UsernameAttributes: ['email', 'phone_number'],
          UsernameConfiguration: {
            CaseSensitive: true,
          },
          VerificationMessageTemplate: {
            DefaultEmailOption: 'CONFIRM_WITH_CODE',
            EmailMessage: 'verification test {####}',
            EmailSubject: 'test',
            SmsMessage: 'verification sms {####}',
          },
        },
      });
    });

    it('should extend auth resources creation', async () => {
      const extend = jest.fn();

      const { config } = getResourceConfig();

      const resolver = new AuthResolver({
        name: 'test',
        extend,
      });

      await resolver.beforeCreate(config);

      expect(extend.mock.calls).toHaveLength(1);
    });
  });

  describe('parse', () => {
    afterEach(() => {
      unlinkSync(join(__dirname, './resolver-spec.ts.js'));
    });
    it('should add event trigger', async () => {
      @AuthExtension({})
      class ExtensionTest {
        @Trigger({
          type: 'preSignUp',
        })
        preSignUp() {}
      }

      const { stack, nestedStack, config } = getResourceConfig();

      const resolver = new AuthResolver({
        name: 'test',
      });

      await resolver.beforeCreate(config);

      await resolver.parser({
        app: config,
        nestedStack: {
          scope: nestedStack,
          lambdaGlobalConfig: {},
          name: 'nested-test',
        },
        stackResource: ExtensionTest,
      });

      Template.fromStack(stack).hasResource('AWS::Cognito::UserPool', {
        Properties: {
          LambdaConfig: {
            PreSignUp: {},
          },
        },
      });
    });
  });
});
