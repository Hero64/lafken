import { CognitoIdentityProvider } from '@cdktn/provider-aws/lib/cognito-identity-provider';
import { CognitoUserPool } from '@cdktn/provider-aws/lib/cognito-user-pool';
import { enableBuildEnvVariable, getMetadataPrototypeByKey } from '@lafken/common';
import { setupTestingStack } from '@lafken/resolver';
import { Testing } from 'cdktn';
import { describe, expect, it } from 'vitest';
import {
  Attributes,
  authFieldKey,
  Custom,
  type CustomAttributesMetadata,
  Standard,
  type StandardAttributeMetadata,
} from '../../../../main';
import type { IdentityProvider as IdentityProviderType } from '../user-pool.types';
import { IdentityProvider } from './identity-provider';

const setupIdentityProvider = () => {
  const { stack } = setupTestingStack();
  const userPool = new CognitoUserPool(stack, 'user-pool-test', {
    name: 'user-pool-test',
  });

  return {
    stack,
    userPool,
  };
};

describe('Auth identity provider', () => {
  enableBuildEnvVariable();

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

  const attributes = getMetadataPrototypeByKey<
    (CustomAttributesMetadata | StandardAttributeMetadata)[]
  >(AuthAttributes, authFieldKey);

  const attributesByName = attributes.reduce(
    (acc, current) => {
      acc[current.name] = current;
      return acc;
    },
    {} as Record<string, CustomAttributesMetadata | StandardAttributeMetadata>
  );

  it('should create a google identity provider', () => {
    const { userPool, stack } = setupIdentityProvider();

    const props: IdentityProviderType<typeof AuthAttributes> = {
      type: 'google',
      attributes: {
        email: 'email',
        familyName: 'family_name',
        name: 'name',
        profile: 'profile',
      },
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      scopes: ['foo', 'bar'],
    };

    new IdentityProvider(stack, 'test', {
      ...props,
      userPoolId: userPool.id,
      attributeByName: attributesByName,
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(CognitoIdentityProvider, {
      attribute_mapping: {
        'custom:profile': 'profile',
        email: 'email',
        family_name: 'family_name',
        name: 'name',
      },
      provider_details: {
        authorize_scopes: 'foo bar',
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
      },
      provider_name: 'test-identity-provider',
      provider_type: 'Google',
    });
  });

  it('should create a facebook identity provider', () => {
    const { userPool, stack } = setupIdentityProvider();

    const props: IdentityProviderType<typeof AuthAttributes> = {
      type: 'facebook',
      apiVersion: 'v3',
      attributes: {
        email: 'email',
        familyName: 'family_name',
        name: 'name',
        profile: 'profile',
      },
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      scopes: ['foo', 'bar'],
    };

    new IdentityProvider(stack, 'test', {
      ...props,
      userPoolId: userPool.id,
      attributeByName: attributesByName,
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(CognitoIdentityProvider, {
      attribute_mapping: {
        'custom:profile': 'profile',
        email: 'email',
        family_name: 'family_name',
        name: 'name',
      },
      provider_details: {
        authorize_scopes: 'foo,bar',
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
        api_version: 'v3',
      },
      provider_name: 'test-identity-provider',
      provider_type: 'Facebook',
    });
  });

  it('should create a amazon identity provider', () => {
    const { userPool, stack } = setupIdentityProvider();

    const props: IdentityProviderType<typeof AuthAttributes> = {
      type: 'amazon',
      attributes: {
        email: 'email',
        familyName: 'family_name',
        name: 'name',
        profile: 'profile',
      },
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      scopes: ['foo', 'bar'],
    };

    new IdentityProvider(stack, 'test', {
      ...props,
      userPoolId: userPool.id,
      attributeByName: attributesByName,
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(CognitoIdentityProvider, {
      attribute_mapping: {
        'custom:profile': 'profile',
        email: 'email',
        family_name: 'family_name',
        name: 'name',
      },
      provider_details: {
        authorize_scopes: 'foo bar',
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
      },
      provider_name: 'test-identity-provider',
      provider_type: 'LoginWithAmazon',
    });
  });

  it('should create a Apple identity provider', () => {
    const { userPool, stack } = setupIdentityProvider();

    const props: IdentityProviderType<typeof AuthAttributes> = {
      type: 'apple',
      attributes: {
        email: 'email',
        familyName: 'first_name',
        name: 'name',
        profile: 'profile',
      },
      keyId: '1',
      privateKeyValue: 'email',
      teamId: 'test',
      clientId: 'test-client-id',
      scopes: ['foo', 'bar'],
    };

    new IdentityProvider(stack, 'test', {
      ...props,
      userPoolId: userPool.id,
      attributeByName: attributesByName,
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(CognitoIdentityProvider, {
      attribute_mapping: {
        'custom:profile': 'profile',
        email: 'email',
        family_name: 'first_name',
        name: 'name',
      },
      provider_details: {
        authorize_scopes: 'foo bar',
        client_id: 'test-client-id',
        key_id: '1',
        private_key: 'email',
        team_id: 'test',
      },
      provider_name: 'test-identity-provider',
      provider_type: 'SignInWithApple',
    });
  });

  it('should create a oidc identity provider', () => {
    const { userPool, stack } = setupIdentityProvider();

    const props: IdentityProviderType<typeof AuthAttributes> = {
      type: 'oidc',
      attributes: {
        email: 'email',
        familyName: 'family_name',
        name: 'name',
        profile: 'profile',
      },
      attributesRequestMethod: 'POST',
      attributesUrl: 'http://example.attribute.com',
      authorizeUrl: 'http://example.authorize.com',
      jwksUri: 'http://example.jwk.com',
      tokenUrl: 'http://example.token.com',
      name: 'test',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      scopes: ['foo', 'bar'],
    };

    new IdentityProvider(stack, 'test', {
      ...props,
      userPoolId: userPool.id,
      attributeByName: attributesByName,
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(CognitoIdentityProvider, {
      attribute_mapping: {
        'custom:profile': 'profile',
        email: 'email',
        family_name: 'family_name',
        name: 'name',
      },
      provider_details: {
        attributes_request_method: 'POST',
        attributes_url: 'http://example.attribute.com',
        authorize_scopes: 'foo bar',
        authorize_url: 'http://example.authorize.com',
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
        jwks_uri: 'http://example.jwk.com',
        token_url: 'http://example.token.com',
      },
      provider_name: 'test-identity-provider',
      provider_type: 'OIDC',
    });
  });
});
