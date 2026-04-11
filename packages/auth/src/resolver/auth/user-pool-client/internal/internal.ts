import type {
  CognitoUserPoolClientConfig,
  CognitoUserPoolClientRefreshTokenRotation,
} from '@cdktn/provider-aws/lib/cognito-user-pool-client';
import { ResourceOutput } from '@lafken/resolver';
import { Construct } from 'constructs';
import type { AuthAttributes } from '../../../../main';
import { mapUserAttributes } from '../../auth.utils';
import type {
  AuthFlow,
  InternalUserClientProps,
  InternalUserPoolClientProps,
  OAuthConfig,
  UserPoolClientOutputAttributes,
  ValidityUnit,
} from '../user-pool-client.types';
import { DataInternalUserPoolClient } from '../user-pool-client.utils';

export class InternalUserPoolClient extends Construct {
  public cognitoUserPoolClient: DataInternalUserPoolClient;
  constructor(
    scope: Construct,
    id: string,
    private props: InternalUserPoolClientProps
  ) {
    super(scope, 'user-pool-client');

    this.cognitoUserPoolClient = new DataInternalUserPoolClient(this, id, {
      ...this.getValidity(props),
      ...this.getOauthConfig(props.oauth),
      name: props.name || id,
      userPoolId: props.userPoolId,
      enableTokenRevocation: props.enableTokenRevocation ?? true,
      generateSecret: props.generateSecret ?? false,
      preventUserExistenceErrors:
        props.preventUserExistenceErrors !== false ? 'ENABLED' : 'LEGACY',
      explicitAuthFlows: this.getExplicitAuthFlows(props.authFlows),
      refreshTokenRotation: this.getRefreshTokenRotation(
        props.refreshTokenRotationGracePeriod
      ),
      readAttributes: this.getAttributes(props.readAttributes as string[]),
      writeAttributes: this.getAttributes(props.writeAttributes as string[]),
    });

    this.cognitoUserPoolClient.isGlobal('user-pool-client', id);

    new ResourceOutput<UserPoolClientOutputAttributes>(
      this.cognitoUserPoolClient,
      props.outputs
    );
  }

  private getRefreshTokenRotation(
    period?: number
  ): CognitoUserPoolClientRefreshTokenRotation[] | undefined {
    if (!period) {
      return;
    }
    return [
      {
        feature: 'ENABLED',
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
    if (!oauth?.flows?.length) {
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

  private getValidity(
    props: InternalUserClientProps<any>
  ): Partial<CognitoUserPoolClientConfig> {
    const accessToken = this.resolveValidityUnit(props.validity?.accessToken);
    const idToken = this.resolveValidityUnit(props.validity?.idToken);
    const refreshToken = this.resolveValidityUnit(props.validity?.refreshToken);

    return {
      authSessionValidity: props.validity?.authSession ?? 3,
      accessTokenValidity: accessToken.value,
      idTokenValidity: idToken.value,
      refreshTokenValidity: refreshToken.value,
      tokenValidityUnits:
        accessToken.unit || idToken.unit || refreshToken.unit
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
        unit: 'hours',
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

      const attributeName =
        attribute.attributeType === 'standard'
          ? mapUserAttributes[attribute.name as keyof AuthAttributes]
          : `custom:${attribute.name}`;

      if (!attributeName) {
        throw new Error(`Attribute ${attribute.name} is not a standard attribute`);
      }

      attributes.push(attributeName);
    }

    return attributes;
  }
}
