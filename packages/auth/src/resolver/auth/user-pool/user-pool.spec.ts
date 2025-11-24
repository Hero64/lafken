import 'cdktf/lib/testing/adapters/jest';
import { enableBuildEnvVariable } from '@alicanto/common';
import { setupTestingStack } from '@alicanto/resolver';
import { CognitoUserPool } from '@cdktf/provider-aws/lib/cognito-user-pool';
import { Testing } from 'cdktf';
import { Attributes, Custom, Standard } from '../../../main';
import { UserPool } from './user-pool';

describe('Auth user pool', () => {
  enableBuildEnvVariable();

  it('should create a simple user pool', async () => {
    const { stack } = setupTestingStack();

    new UserPool(stack, 'test', {});

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(CognitoUserPool, {
      name: 'test',
    });
  });

  it('should create a user pool with custom properties', async () => {
    @Attributes()
    class AuthAttributes {
      @Standard()
      email: string;

      @Standard()
      name: string;

      @Standard()
      familyName: string;

      @Custom()
      profile: string;
    }

    const { stack } = setupTestingStack();

    new UserPool(stack, 'test', {
      attributes: AuthAttributes,
      accountRecovery: ['verified_email', 'verified_phone_number'],
      autoVerifyAttributes: ['email', 'phone'],
      cognitoPlan: 'plus',
      email: {
        arn: 'test',
        account: 'ses',
        configurationSet: 'set',
        from: 'foo@example.com',
        reply: 'bar@example.com',
      },
      identityProviders: [
        {
          type: 'google',
          attributes: {
            email: 'email',
            familyName: 'family_name',
          },
          clientId: 'test',
          clientSecret: 'test',
          scopes: ['foo', 'bar'],
        },
      ],
      invitationMessage: {
        email: {
          body: 'Invitation EMIAL',
          subject: 'invitation',
        },
        sms: 'invitation SMS',
      },
      mfa: {
        status: 'optional',
        email: {
          body: 'MFA',
          subject: 'mfa',
        },
        sms: 'MFA',
      },
      passwordPolicy: {
        minLength: 100,
        requireDigits: true,
      },
      selfSignUpEnabled: true,
      signInAliases: ['phone', 'preferred_username'],
      signInCaseSensitive: true,
      userVerification: {
        email: {
          type: 'code',
          body: 'verification',
          subject: 'verification',
        },
        sms: 'verification',
      },
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(CognitoUserPool, {
      account_recovery_setting: {
        recovery_mechanism: [
          {
            name: 'verified_email',
            priority: 1,
          },
          {
            name: 'verified_phone_number',
            priority: 2,
          },
        ],
      },
      admin_create_user_config: {
        allow_admin_create_user_only: false,
        invite_message_template: {
          email_message: 'Invitation EMIAL',
          email_subject: 'invitation',
          sms_message: 'invitation SMS',
        },
      },
      alias_attributes: ['phoneNumber', 'preferred_username'],
      auto_verified_attributes: ['email', 'phone_number'],
      email_configuration: {
        configuration_set: 'set',
        email_sending_account: 'DEVELOPER',
        from_email_address: 'foo@example.com',
        reply_to_email_address: 'bar@example.com',
        source_arn: 'test',
      },
      email_mfa_configuration: {
        message: 'MFA',
        subject: 'mfa',
      },
      lifecycle: {
        ignore_changes: ['schema'],
      },
      mfa_configuration: 'OPTIONAL',
      name: 'test',
      password_policy: {
        minimum_length: 100,
        require_numbers: true,
      },
      schema: [
        {
          attribute_data_type: 'String',
          mutable: true,
          name: 'email',
          required: true,
          string_attribute_constraints: {
            max_length: 2048,
            min_length: 1,
          },
        },
        {
          attribute_data_type: 'String',
          mutable: true,
          name: 'name',
          required: true,
          string_attribute_constraints: {
            max_length: 2048,
            min_length: 1,
          },
        },
        {
          attribute_data_type: 'String',
          mutable: true,
          name: 'family_name',
          required: true,
          string_attribute_constraints: {
            max_length: 2048,
            min_length: 1,
          },
        },
        {
          attribute_data_type: 'String',
          mutable: true,
          name: 'profile',
          string_attribute_constraints: {
            max_length: 2048,
            min_length: 0,
          },
        },
      ],
      sms_authentication_message: 'MFA',
      sms_configuration: {
        external_id: 'test-sms-config',
        sns_caller_arn: '${aws_iam_role.test-cognito-sms-role.arn}',
      },
      user_pool_tier: 'PLUS',
      username_configuration: {
        case_sensitive: true,
      },
      verification_message_template: {
        default_email_option: 'CONFIRM_WITH_CODE',
        email_message: 'verification',
        email_subject: 'verification',
        sms_message: 'verification',
      },
    });
  });
});
