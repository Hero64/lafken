import { alicantoResource } from '@alicanto/resolver';
import type { CognitoUserPool } from '@cdktf/provider-aws/lib/cognito-user-pool';
import {
  CognitoUserPoolClient,
  type CognitoUserPoolClientConfig,
  type CognitoUserPoolClientRefreshTokenRotation,
} from '@cdktf/provider-aws/lib/cognito-user-pool-client';
import { Construct } from 'constructs';
import type {
  AuthFlow,
  OAuthConfig,
  UserClient,
  UserPoolClientProps,
  ValidityUnit,
} from './user-pool-client.types';

export class UserPoolClient extends Construct {
  public cognitoUserPoolClient: CognitoUserPoolClient;
  constructor(
    scope: Construct,
    id: string,
    private props: UserPoolClientProps
  ) {
    super(scope, 'user-pool-client');

    const userPool = alicantoResource.getResource<CognitoUserPool>(`auth-${id}`);

    this.cognitoUserPoolClient = new CognitoUserPoolClient(this, id, {
      ...this.getValidity(props),
      ...this.getOauthConfig(props.oauth),
      name: `${id}-client`,
      userPoolId: userPool.id,
      enableTokenRevocation: props.enableTokenRevocation,
      generateSecret: props.generateSecret,
      preventUserExistenceErrors: props.preventUserExistenceErrors
        ? 'ENABLED'
        : undefined,
      explicitAuthFlows: this.getExplicitAuthFlows(props.authFlows),
      refreshTokenRotation: this.getRefreshTokenRotation(
        props.refreshTokenRotationGracePeriod
      ),
      readAttributes: this.getAttributes(props.readAttributes as string[]),
      writeAttributes: this.getAttributes(props.writeAttributes as string[]),
    });
  }

  private getRefreshTokenRotation(
    period?: number
  ): CognitoUserPoolClientRefreshTokenRotation[] | undefined {
    if (!period) {
      return;
    }
    return [
      {
        feature: period === undefined ? 'DISABLED' : 'ENABLED',
        retryGracePeriodSeconds: period,
      },
    ];
  }

  private getExplicitAuthFlows(authFlows?: AuthFlow[]) {
    if (!authFlows?.length) {
      return undefined;
    }

    return authFlows.map((flow) => flow.toUpperCase());
  }

  private getOauthConfig(oauth?: OAuthConfig): Partial<CognitoUserPoolClientConfig> {
    if (!oauth || !oauth.flows?.length) {
      return {};
    }

    return {
      allowedOauthFlowsUserPoolClient: true,
      allowedOauthFlows: oauth.flows,
      allowedOauthScopes: oauth.scopes,
      callbackUrls: oauth.callbackUrls,
      defaultRedirectUri: oauth.defaultRedirectUri,
      logoutUrls: oauth.logoutUrls,
    };
  }

  private getValidity(props: UserClient<any>): Partial<CognitoUserPoolClientConfig> {
    const accessToken = this.resolveValidityUnit(props.validity?.accessToken);
    const idToken = this.resolveValidityUnit(props.validity?.idToken);
    const refreshToken = this.resolveValidityUnit(props.validity?.refreshToken);

    return {
      authSessionValidity: props.validity?.authSession,
      accessTokenValidity: accessToken.value,
      idTokenValidity: idToken.value,
      refreshTokenValidity: refreshToken.value,
      tokenValidityUnits:
        accessToken.unit || idToken.unit || refreshToken
          ? [
              {
                accessToken: accessToken.unit,
                refreshToken: refreshToken.unit,
                idToken: idToken.unit,
              },
            ]
          : undefined,
    };
  }

  private resolveValidityUnit(value?: number | ValidityUnit) {
    if (!value) {
      return {};
    }

    if (typeof value === 'number') {
      return {
        value,
        unit: 'hour',
      };
    }

    return {
      value: value.value,
      unit: value.type,
    };
  }

  private getAttributes(selectedAttributes?: string[]) {
    if (!selectedAttributes?.length) {
      return;
    }

    const attributes: string[] = [];
    for (const providerAttribute of selectedAttributes) {
      const attribute = this.props.attributeByName[providerAttribute];

      if (!attribute) {
        throw new Error(`Attribute ${providerAttribute} not exist in attribute class`);
      }

      attributes.push(
        attribute.attributeType === 'standard'
          ? attribute.name
          : `custom:${attribute.name}`
      );
    }

    return attributes;
  }
}
