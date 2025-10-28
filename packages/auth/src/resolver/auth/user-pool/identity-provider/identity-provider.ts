import { CognitoIdentityProvider } from '@cdktf/provider-aws/lib/cognito-identity-provider';
import { Construct } from 'constructs';
import type {
  AmazonIdentityProvider,
  AppleIdentityProvider,
  FacebookIdentityProvider,
  GoogleIdentityProvider,
  OidcIdentityProvider,
} from '../user-pool.types';
import type { IdentityProviderProps } from './identity-provider.types';

export class IdentityProvider extends Construct {
  constructor(
    scope: Construct,
    private id: string,
    private props: IdentityProviderProps
  ) {
    super(scope, id);

    switch (props.type) {
      case 'google':
        this.createGoogleProvider(props);
        break;
      case 'facebook':
        this.createFacebookProvider(props);
        break;
      case 'amazon':
        this.createAmazonProvider(props);
        break;
      case 'apple':
        this.createAppleProvider(props);
        break;
      case 'oidc':
        this.createOdicProvider(props);
        break;
    }
  }

  private createGoogleProvider(props: GoogleIdentityProvider<any>) {
    new CognitoIdentityProvider(this, 'google-identity-provider', {
      userPoolId: this.props.userPoolId,
      providerName: `${this.id}-identity-provider`,
      providerType: 'Google',
      providerDetails: {
        client_id: props.clientId,
        client_secret: props.clientSecret,
        authorize_scopes: props.scopes.join(' '),
      },
      attributeMapping: this.getProviderAttributes(
        props.attributes as Record<string, string>
      ),
    });
  }

  private createFacebookProvider(props: FacebookIdentityProvider<any>) {
    new CognitoIdentityProvider(this, 'facebook-identity-provider', {
      userPoolId: this.props.userPoolId,
      providerName: `${this.id}-identity-provider`,
      providerType: 'Facebook',
      providerDetails: {
        client_id: props.clientId,
        client_secret: props.clientSecret,
        authorize_scopes: props.scopes.join(','),
      },
      attributeMapping: this.getProviderAttributes(
        props.attributes as Record<string, string>
      ),
    });
  }

  private createAmazonProvider(props: AmazonIdentityProvider<any>) {
    new CognitoIdentityProvider(this, 'amazon-identity-provider', {
      userPoolId: this.props.userPoolId,
      providerName: `${this.id}-identity-provider`,
      providerType: 'Amazon',
      providerDetails: {
        client_id: props.clientId,
        client_secret: props.clientSecret,
        authorize_scopes: props.scopes.join(' '),
      },
      attributeMapping: this.getProviderAttributes(
        props.attributes as Record<string, string>
      ),
    });
  }

  private createAppleProvider(props: AppleIdentityProvider<any>) {
    new CognitoIdentityProvider(this, 'amazon-identity-provider', {
      userPoolId: this.props.userPoolId,
      providerName: `${this.id}-identity-provider`,
      providerType: 'Apple',
      providerDetails: {
        client_id: props.clientId,
        team_id: props.teamId,
        key_id: props.keyId,
        private_key: props.privateKeyValue,
        authorize_scopes: props.scopes.join(' '),
      },
      attributeMapping: this.getProviderAttributes(
        props.attributes as Record<string, string>
      ),
    });
  }

  private createOdicProvider(props: OidcIdentityProvider<any>) {
    new CognitoIdentityProvider(this, 'oidc-identity-provider', {
      userPoolId: this.props.userPoolId,
      providerName: `${this.id}-identity-provider`,
      providerType: 'OIDC',
      providerDetails: {
        client_id: props.clientId,
        client_secret: props.clientSecret,
        authorize_scopes: props.scopes.join(' '),
        attributes_request_method: props.attributesRequestMethod,
        authorize_url: props.attributesUrl,
        token_url: props.tokenUrl,
        attributes_url: props.attributesUrl,
        jwks_uri: props.jwksUri,
      },
      attributeMapping: this.getProviderAttributes(
        props.attributes as Record<string, string>
      ),
    });
  }

  private getProviderAttributes(providerAttributes: Record<string, string>) {
    const attributes: Record<string, string> = {};
    for (const providerAttribute in providerAttributes) {
      const attribute = this.props.attributeByName[providerAttribute];

      if (!attribute) {
        throw new Error(`Attribute ${providerAttribute} not exist in attribute class`);
      }

      const attributeName =
        attribute.attributeType === 'standard'
          ? attribute.name
          : `custom:${attribute.name}`;

      attributes[attributeName] = providerAttributes[providerAttribute];
    }

    return attributes;
  }
}
