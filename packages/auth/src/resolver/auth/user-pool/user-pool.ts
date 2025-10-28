import {
  type ClassResource,
  FieldProperties,
  getMetadataPrototypeByKey,
  getResourceHandlerMetadata,
  getResourceMetadata,
  type StripReadonly,
} from '@alicanto/common';
import { alicantoResource } from '@alicanto/resolver';
import {
  CognitoUserPool,
  type CognitoUserPoolConfig,
  type CognitoUserPoolLambdaConfig,
  type CognitoUserPoolSchema,
  type CognitoUserPoolSchemaNumberAttributeConstraints,
  type CognitoUserPoolSchemaStringAttributeConstraints,
  type CognitoUserPoolVerificationMessageTemplate,
} from '@cdktf/provider-aws/lib/cognito-user-pool';
import { IamRole } from '@cdktf/provider-aws/lib/iam-role';
import { Token } from 'cdktf';
import { Construct } from 'constructs';
import type { CustomAttributesMetadata, StandardAttributeMetadata } from '../../../main';
import { RESOURCE_TYPE } from '../../../main/extension/extension';
import type { TriggerMetadata } from '../../../main/extension/extension.types';
import { Extension } from './extension/extension';
import { IdentityProvider } from './identity-provider/identity-provider';
import type {
  AccountRecovery,
  AutoVerifyAttributes,
  CognitoPlan,
  EmailConfig,
  InvitationMessage,
  Mfa,
  PasswordPolicy,
  SignInAliases,
  UserPoolProps,
  UserVerification,
} from './user-pool.types';

const standardAttributes = new Set([
  'email',
  'fullName',
  'nickname',
  'birthday',
  'lastName',
  'gender',
  'firstName',
  'lastUpdateTime',
  'locale',
  'middleName',
  'phoneNumber',
  'picture',
  'website',
]);

export class UserPool extends Construct {
  public attributeByName: Record<
    string,
    CustomAttributesMetadata | StandardAttributeMetadata
  > = {};
  public cognitoUserPool: CognitoUserPool;
  constructor(
    scope: Construct,
    private id: string,
    private props: UserPoolProps
  ) {
    super(scope, 'user-pool');
  }

  public async create() {
    const userPool = alicantoResource.create('auth', CognitoUserPool, this, this.id, {
      ...this.getMfaConfig(this.props.mfa),
      name: `${this.id}-user-pool`,
      autoVerifiedAttributes: this.getAutoVerifiedAttributes(
        this.props.autoVerifyAttributes
      ),
      accountRecoverySetting: this.getAccountRecoverySettings(this.props.accountRecovery),
      aliasAttributes: this.getAliasAttributes(this.props.signInAliases),
      adminCreateUserConfig: this.getAdminCreateUserConfig(
        this.props.selfSignUpEnabled,
        this.props.invitationMessage
      ),
      passwordPolicy: this.getPasswordPolicy(this.props.passwordPolicy),
      emailConfiguration: this.getEmailConfig(this.props.email),
      userPoolTier: this.getCognitoPlan(this.props.cognitoPlan),
      usernameConfiguration: this.getSignInCaseSensitive(this.props.signInCaseSensitive),
      verificationMessageTemplate: this.getUserVerification(this.props.userVerification),
      schema: this.getUserAttributes(this.props.attributes),
      smsConfiguration: this.getSmsConfig(this.props.mfa, this.props.userVerification),
      lambdaConfig: await this.getLambdaConfig(),
    });

    userPool.isGlobal();

    this.cognitoUserPool = userPool;

    if (this.props.identityProviders?.length) {
      for (const identityProvider of this.props.identityProviders) {
        new IdentityProvider(this, identityProvider.type, {
          ...identityProvider,
          attributeByName: this.attributeByName,
          userPoolId: userPool.id,
        });
      }
    }
  }

  private async getLambdaConfig() {
    let lambdaConfig: StripReadonly<CognitoUserPoolLambdaConfig> = {};

    for (const extension of this.props.extensions || []) {
      const metadata = getResourceMetadata(extension);

      if (metadata.type !== RESOURCE_TYPE) {
        throw new Error(`extension should have @AuthExtension decorator`);
      }

      const handlers = getResourceHandlerMetadata<TriggerMetadata>(extension);

      const trigger = new Extension(this, `${metadata.name}-extension`, {
        handlers,
        resourceMetadata: metadata,
      });

      const triggers = await trigger.createTriggers();
      for (const key in triggers) {
        const configKey = key as keyof CognitoUserPoolLambdaConfig;
        if (lambdaConfig[configKey] !== undefined) {
          throw new Error(`trigger ${key} already exist`);
        }
      }

      lambdaConfig = {
        ...lambdaConfig,
        ...triggers,
      };
    }

    return lambdaConfig;
  }

  private getSmsConfig(mfa?: Mfa, userVerification?: UserVerification) {
    if ((!mfa || mfa.status === 'off' || !mfa.sms) && !userVerification) {
      return;
    }

    const externalId = `${this.id}-sms-config`;

    const snsRole = new IamRole(this, 'cognitoSmsRole', {
      name: 'cognito-sms-role',
      assumeRolePolicy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { Service: 'cognito-idp.amazonaws.com' },
            Action: 'sts:AssumeRole',
            Condition: {
              StringEquals: {
                'sts:ExternalId': externalId,
              },
            },
          },
        ],
      }),
      inlinePolicy: [
        {
          name: 'AllowSnsPublish',
          policy: JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: ['sns:Publish'],
                Resource: '*',
              },
            ],
          }),
        },
      ],
    });

    return {
      externalId,
      snsCallerArn: snsRole.arn,
    };
  }

  private getMfaConfig(mfa?: Mfa): Partial<CognitoUserPoolConfig> | undefined {
    if (!mfa || mfa.status === 'off') {
      return;
    }

    const config: Partial<StripReadonly<CognitoUserPoolConfig>> = {
      mfaConfiguration: mfa.status === 'optional' ? 'OPTIONAL' : 'ON',
    };

    if (mfa.sms) {
      config.smsAuthenticationMessage = mfa.sms;
    }

    if (mfa.email) {
      config.emailMfaConfiguration = {
        message: mfa.email.body,
        subject: mfa.email.subject,
      };
    }

    if (mfa.opt) {
      config.softwareTokenMfaConfiguration = {
        enabled: mfa.opt,
      };
    }

    return config as Partial<CognitoUserPoolConfig>;
  }

  private getUserAttributes(attributeClass?: ClassResource) {
    if (!attributeClass) {
      return;
    }

    const schema: CognitoUserPoolSchema[] = [];

    const attributeMetadata = getMetadataPrototypeByKey<
      (CustomAttributesMetadata | StandardAttributeMetadata)[]
    >(attributeClass, FieldProperties.field);

    for (const attribute of attributeMetadata) {
      this.attributeByName[attribute.name] === attribute;
      if (attribute.attributeType === 'standard') {
        if (!standardAttributes.has(attribute.name)) {
          throw new Error(`${attribute.name} is not a standard cognito attribute`);
        }
        schema.push({
          attributeDataType: attribute.attributeType,
          name: attribute.name,
          mutable: attribute.mutable,
          required: attribute.required,
        });
      } else {
        let constrains:
          | CognitoUserPoolSchemaNumberAttributeConstraints
          | CognitoUserPoolSchemaStringAttributeConstraints
          | undefined;

        if (attribute.type === 'Number' && (attribute.max || attribute.min)) {
          constrains = {
            maxValue: attribute.max ? Token.asString(attribute.max) : undefined,
            minValue: attribute.min ? Token.asString(attribute.min) : undefined,
          };
        } else if (attribute.type === 'String' && attribute.maxLen && attribute.minLen) {
          constrains = {
            maxLength: attribute.max ? Token.asString(attribute.maxLen) : undefined,
            minLength: attribute.min ? Token.asString(attribute.minLen) : undefined,
          };
        }

        schema.push({
          attributeDataType: attribute.type === 'Object' ? 'DateTime' : attribute.type,
          name: attribute.name,
          mutable: attribute.mutable,
          numberAttributeConstraints:
            attribute.type === 'Number'
              ? (constrains as CognitoUserPoolSchemaNumberAttributeConstraints)
              : undefined,
          stringAttributeConstraints:
            attribute.type === 'String'
              ? (constrains as CognitoUserPoolSchemaStringAttributeConstraints)
              : undefined,
        });
      }
    }
    return schema;
  }

  private getUserVerification(userVerification?: UserVerification) {
    if (!userVerification) {
      return;
    }

    const verificationTemplate: StripReadonly<CognitoUserPoolVerificationMessageTemplate> =
      {
        smsMessage: userVerification.sms,
      };

    if (!userVerification.email) {
      return verificationTemplate;
    }

    if (userVerification.email.type === 'code') {
      verificationTemplate.defaultEmailOption = 'CONFIRM_WITH_CODE';
      verificationTemplate.emailMessage = userVerification.email.body;
      verificationTemplate.emailSubject = userVerification.email.subject;
      return verificationTemplate;
    }

    verificationTemplate.defaultEmailOption = 'CONFIRM_WITH_LINK';
    verificationTemplate.emailMessageByLink = userVerification.email.body;
    verificationTemplate.emailSubjectByLink = userVerification.email.subject;

    return verificationTemplate;
  }

  private getSignInCaseSensitive(signInCaseSensitive?: boolean) {
    if (signInCaseSensitive === undefined) {
      return;
    }

    return {
      caseSensitive: signInCaseSensitive,
    };
  }

  private getCognitoPlan(plan?: CognitoPlan) {
    if (!plan) {
      return;
    }

    return plan.toUpperCase();
  }

  private getEmailConfig(email?: EmailConfig) {
    if (!email) {
      return;
    }

    if (email.account === 'ses') {
      return {
        emailSendingAccount: 'DEVELOPER',
        sourceArn: email.arn,
        fromEmailAddress: email.from,
        replyToEmailAddress: email.reply,
        configurationSet: email.configurationSet,
      };
    }

    return {
      emailSendingAccount: 'COGNITO_DEFAULT',
      fromEmailAddress: email.from,
      replyToEmailAddress: email.reply,
    };
  }

  private getAutoVerifiedAttributes(attributes?: AutoVerifyAttributes[]) {
    if (!attributes) {
      return undefined;
    }

    const verifyAttributes: Record<AutoVerifyAttributes, string> = {
      email: 'email',
      phone: 'phoneNumber',
    };

    return attributes.map((attr) => verifyAttributes[attr]);
  }

  private getPasswordPolicy(policy?: PasswordPolicy) {
    if (!policy) {
      return undefined;
    }

    return {
      minimumLength: policy.minLength,
      requireLowercase: policy.requireLowercase,
      requireNumbers: policy.requireDigits,
      requireSymbols: policy.requireSymbols,
      requireUppercase: policy.requireUppercase,
      temporaryPasswordValidityDays: policy.validityDays,
    };
  }

  private getAdminCreateUserConfig(
    selfSignUpEnabled?: boolean,
    invitationMessage?: InvitationMessage
  ) {
    if (selfSignUpEnabled === undefined && !invitationMessage) {
      return undefined;
    }

    return {
      allowAdminCreateUserOnly:
        selfSignUpEnabled !== undefined ? !selfSignUpEnabled : undefined,
      inviteMessageTemplate: invitationMessage
        ? {
            emailMessage: invitationMessage?.email?.body,
            emailSubject: invitationMessage?.email?.subject,
            smsMessage: invitationMessage?.sms,
          }
        : undefined,
    };
  }

  private getAccountRecoverySettings(accountRecovery?: AccountRecovery[]) {
    if (!accountRecovery) {
      return undefined;
    }

    return {
      recoveryMechanism: accountRecovery.map((name, index) => ({
        name,
        priority: index + 1,
      })),
    };
  }

  private getAliasAttributes(signInAliases?: SignInAliases[]) {
    if (!signInAliases) {
      return undefined;
    }
    const aliases: Record<SignInAliases, string> = {
      email: 'email',
      phone: 'phoneNumber',
      preferred_username: 'preferred_username',
    };

    return signInAliases.map((alias) => aliases[alias]);
  }
}
