import 'cdktf/lib/testing/adapters/jest';
import {
  enableBuildEnvVariable,
  FieldProperties,
  getMetadataPrototypeByKey,
} from '@alicanto/common';
import { setupTestingStack } from '@alicanto/resolver';
import { CognitoUserPoolClient } from '@cdktf/provider-aws/lib/cognito-user-pool-client';
import { Testing } from 'cdktf';
import {
  Attributes,
  Custom,
  type CustomAttributesMetadata,
  Standard,
  type StandardAttributeMetadata,
} from '../../../main';
import { UserPoolClient } from './user-pool-client';

describe('Auth user pool client', () => {
  enableBuildEnvVariable();

  it('should create a simple user pool client', () => {
    const { stack } = setupTestingStack();

    new UserPoolClient(stack, 'testing', {
      userPoolId: 'test-id',
      attributeByName: {},
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(CognitoUserPoolClient, {
      name: 'testing',
      user_pool_id: 'test-id',
    });
  });

  it('should create a user pool client with custom properties', () => {
    const { stack } = setupTestingStack();

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
    >(AuthAttributes, FieldProperties.field);

    const attributesByName = attributes.reduce(
      (acc, current) => {
        acc[current.name] = current;
        return acc;
      },
      {} as Record<string, CustomAttributesMetadata | StandardAttributeMetadata>
    );

    new UserPoolClient(stack, 'testing', {
      userPoolId: 'test-id',
      authFlows: ['allow_custom_auth'],
      enableTokenRevocation: true,
      generateSecret: true,
      oauth: {
        callbackUrls: ['http://example.callback.com'],
        defaultRedirectUri: 'http://example.default.com',
        flows: ['code'],
        logoutUrls: ['http://example.logout.com'],
        scopes: ['email', 'phone'],
      },
      preventUserExistenceErrors: true,
      refreshTokenRotationGracePeriod: 10,
      validity: {
        accessToken: 10,
        authSession: 10,
        idToken: {
          type: 'days',
          value: 4,
        },
        refreshToken: 10,
      },
      readAttributes: ['profile', 'email'],
      writeAttributes: ['familyName', 'name'],
      attributeByName: attributesByName,
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(CognitoUserPoolClient, {
      access_token_validity: 10,
      allowed_oauth_flows: ['code'],
      allowed_oauth_flows_user_pool_client: true,
      allowed_oauth_scopes: ['email', 'phone'],
      auth_session_validity: 10,
      callback_urls: ['http://example.callback.com'],
      default_redirect_uri: 'http://example.default.com',
      enable_token_revocation: true,
      explicit_auth_flows: ['ALLOW_CUSTOM_AUTH'],
      generate_secret: true,
      id_token_validity: 4,
      logout_urls: ['http://example.logout.com'],
      name: 'testing',
      prevent_user_existence_errors: 'ENABLED',
      read_attributes: ['custom:profile', 'email'],
      refresh_token_rotation: [
        {
          feature: 'ENABLED',
          retry_grace_period_seconds: 10,
        },
      ],
      refresh_token_validity: 10,
      token_validity_units: [
        {
          access_token: 'hours',
          id_token: 'days',
          refresh_token: 'hours',
        },
      ],
      user_pool_id: 'test-id',
      write_attributes: ['family_name', 'name'],
    });
  });
});
