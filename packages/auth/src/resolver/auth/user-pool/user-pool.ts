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
import type { Construct } from 'constructs';
import type {
  AuthAttributes,
  CustomAttributesMetadata,
  StandardAttributeMetadata,
} from '../../../main';
import { RESOURCE_TYPE } from '../../../main/extension/extension';
import type { TriggerMetadata } from '../../../main/extension/extension.types';
import { mapUserAttributes } from '../auth.utils';
import { Extension } from './extension/extension';
import { IdentityProvider } from './identity-provider/identity-provider';
import type {
  AccountRecovery,
  AutoVerifyAttributes,
  CognitoPlan,
  EmailConfig,
  IdentityProvider as IdentityProviderType,
  InvitationMessage,
  Mfa,
  PasswordPolicy,
  SignInAliases,
  UserPoolProps,
  UserVerification,
} from './user-pool.types';

export class UserPool extends alicantoResource.make(CognitoUserPool) {
  public attributeByName: Record<
    string,
    CustomAttributesMetadata | StandardAttributeMetadata
  > = {};
  constructor(scope: Construct, id: string, props: UserPoolProps) {
    const attributes = UserPool.getUserAttributes(props.attributes);

    super(scope, `${id}-user-pool`, {
      ...UserPool.getMfaConfig(props.mfa),
      name: id,
      autoVerifiedAttributes: UserPool.getAutoVerifiedAttributes(
        props.autoVerifyAttributes
      ),
      accountRecoverySetting: UserPool.getAccountRecoverySettings(props.accountRecovery),
      aliasAttributes: UserPool.getAliasAttributes(props.signInAliases),
      adminCreateUserConfig: UserPool.getAdminCreateUserConfig(
        props.selfSignUpEnabled,
        props.invitationMessage
      ),
      passwordPolicy: UserPool.getPasswordPolicy(props.passwordPolicy),
      emailConfiguration: UserPool.getEmailConfig(props.email),
      userPoolTier: UserPool.getCognitoPlan(props.cognitoPlan),
      usernameConfiguration: UserPool.getSignInCaseSensitive(props.signInCaseSensitive),
      verificationMessageTemplate: UserPool.getUserVerification(props.userVerification),
      schema: attributes?.schema,
      smsConfiguration: UserPool.getSmsConfig(
        scope,
        id,
        props.mfa,
        props.userVerification
      ),
      lambdaConfig: UserPool.getLambdaConfig(scope, props.extensions),
    });

    if (attributes?.attributeByName) {
      this.attributeByName = attributes.attributeByName;
    }

    this.isGlobal('auth');
    this.assignIdentityProviders(props.identityProviders);
  }

  private assignIdentityProviders(identityProviders?: IdentityProviderType<any>[]) {
    if (identityProviders?.length) {
      for (const identityProvider of identityProviders) {
        new IdentityProvider(this, identityProvider.type, {
          ...identityProvider,
          attributeByName: this.attributeByName,
          userPoolId: this.id,
        });
      }
    }
  }

  private static getLambdaConfig(scope: Construct, extensions: ClassResource[] = []) {
    let lambdaConfig: StripReadonly<CognitoUserPoolLambdaConfig> = {};

    for (const extension of extensions) {
      const metadata = getResourceMetadata(extension);

      if (metadata.type !== RESOURCE_TYPE) {
        throw new Error(`extension should have @AuthExtension decorator`);
      }

      const handlers = getResourceHandlerMetadata<TriggerMetadata>(extension);

      const trigger = new Extension(scope, `${metadata.name}-extension`, {
        handlers,
        resourceMetadata: metadata,
      });

      const triggers = trigger.createTriggers();
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

  private static getSmsConfig(
    scope: Construct,
    id: string,
    mfa?: Mfa,
    userVerification?: UserVerification
  ) {
    if ((!mfa || mfa.status === 'off' || !mfa.sms) && !userVerification) {
      return;
    }

    const externalId = `${id}-sms-config`;
    const roleId = `${id}-cognito-sms-role`;

    const snsRole = new IamRole(scope, roleId, {
      name: roleId,
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

  private static getMfaConfig(mfa?: Mfa): Partial<CognitoUserPoolConfig> | undefined {
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

  private static getUserAttributes(attributeClass?: ClassResource) {
    if (!attributeClass) {
      return;
    }

    const attributeByName: Record<
      string,
      CustomAttributesMetadata | StandardAttributeMetadata
    > = {};

    const schema: CognitoUserPoolSchema[] = [];

    const attributeMetadata = getMetadataPrototypeByKey<
      (CustomAttributesMetadata | StandardAttributeMetadata)[]
    >(attributeClass, FieldProperties.field);

    for (const attribute of attributeMetadata) {
      attributeByName[attribute.name] = attribute;
      if (attribute.attributeType === 'standard') {
        const attributeName = mapUserAttributes[attribute.name as keyof AuthAttributes];

        if (!attributeName) {
          throw new Error(`${attribute.name} is not a standard cognito attribute`);
        }
        schema.push({
          attributeDataType: attribute.type,
          name: attributeName,
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
    return {
      schema,
      attributeByName,
    };
  }

  private static getUserVerification(userVerification?: UserVerification) {
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

  private static getSignInCaseSensitive(signInCaseSensitive?: boolean) {
    if (signInCaseSensitive === undefined) {
      return;
    }

    return {
      caseSensitive: signInCaseSensitive,
    };
  }

  private static getCognitoPlan(plan?: CognitoPlan) {
    if (!plan) {
      return;
    }

    return plan.toUpperCase();
  }

  private static getEmailConfig(email?: EmailConfig) {
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

  private static getAutoVerifiedAttributes(attributes?: AutoVerifyAttributes[]) {
    if (!attributes) {
      return undefined;
    }

    const verifyAttributes: Record<AutoVerifyAttributes, string> = {
      email: 'email',
      phone: 'phoneNumber',
    };

    return attributes.map((attr) => verifyAttributes[attr]);
  }

  private static getPasswordPolicy(policy?: PasswordPolicy) {
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

  private static getAdminCreateUserConfig(
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

  private static getAccountRecoverySettings(accountRecovery?: AccountRecovery[]) {
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

  private static getAliasAttributes(signInAliases?: SignInAliases[]) {
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
