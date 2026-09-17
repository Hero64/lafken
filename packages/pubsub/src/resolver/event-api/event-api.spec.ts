import { AppsyncApi } from '@cdktn/provider-aws/lib/appsync-api';
import { AppsyncApiKey } from '@cdktn/provider-aws/lib/appsync-api-key';
import { enableBuildEnvVariable } from '@lafken/common';
import { lafkenResource, setupTestingStackWithModule } from '@lafken/resolver';
import { Testing } from 'cdktn';
import { describe, expect, it, vi } from 'vitest';
import {
  ApiKeyAuthorizer,
  AuthorizerHandler,
  CognitoAuthorizer,
  IamAuthorizer,
  LambdaAuthorizer,
} from '../../main';
import { EventApi } from './event-api';

vi.mock('@lafken/resolver', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lafken/resolver')>();

  return {
    ...actual,
    LambdaHandler: vi.fn().mockImplementation(function (this: any) {
      this.arn = 'test-authorizer-arn';
      this.invokeArn = 'test-authorizer-invoke-arn';
    }),
  };
});

describe('EventApi', () => {
  enableBuildEnvVariable();

  it('defaults to a single API_KEY authorizer', () => {
    const { stack, module } = setupTestingStackWithModule();

    const eventApi = new EventApi(module, 'events', { name: 'events' });

    expect(eventApi.authorizerFactory.getAuthType('default')).toBe('API_KEY');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(AppsyncApi, {
      name: 'events',
      event_config: [
        {
          auth_provider: [{ auth_type: 'API_KEY' }],
          connection_auth_mode: [{ auth_type: 'API_KEY' }],
          default_publish_auth_mode: [{ auth_type: 'API_KEY' }],
          default_subscribe_auth_mode: [{ auth_type: 'API_KEY' }],
        },
      ],
    });
  });

  it('exposes httpDomain/realtimeDomain and registers itself for getResourceValue', () => {
    const { module } = setupTestingStackWithModule();
    const eventApi = new EventApi(module, 'events', { name: 'events' });

    expect(eventApi.httpDomain).toBeTruthy();
    expect(eventApi.realtimeDomain).toBeTruthy();
    expect(eventApi.httpDomain).not.toBe(eventApi.realtimeDomain);

    const registered = lafkenResource.getResource<EventApi>('event-api', 'events');
    expect(registered).toBe(eventApi);
    expect(registered.httpDomain).toBeTruthy();
  });

  it('creates an api key resource for @ApiKeyAuthorizer', () => {
    @ApiKeyAuthorizer({ name: 'public-key', description: 'public access' })
    class PublicKeyAuth {}

    const { stack, module } = setupTestingStackWithModule();
    const eventApi = new EventApi(module, 'events', {
      name: 'events',
      authorizers: [PublicKeyAuth],
    });

    expect(eventApi.authorizerFactory.getAuthType('public-key')).toBe('API_KEY');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(AppsyncApiKey, {
      description: 'public access',
    });
  });

  it('allows publishing/subscribing over AWS_IAM for @IamAuthorizer', () => {
    @IamAuthorizer({ name: 'backend-auth' })
    class BackendAuth {}

    const { stack, module } = setupTestingStackWithModule();
    const eventApi = new EventApi(module, 'events', {
      name: 'events',
      authorizers: [BackendAuth],
    });

    expect(eventApi.authorizerFactory.getAuthType('backend-auth')).toBe('AWS_IAM');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(AppsyncApi, {
      event_config: [
        {
          auth_provider: [{ auth_type: 'AWS_IAM' }],
          connection_auth_mode: [{ auth_type: 'AWS_IAM' }],
          default_publish_auth_mode: [{ auth_type: 'AWS_IAM' }],
          default_subscribe_auth_mode: [{ auth_type: 'AWS_IAM' }],
        },
      ],
    });
  });

  it('wires a cognito authorizer with the resolved user pool id and region', () => {
    @CognitoAuthorizer({ name: 'app-users', userPoolId: () => 'us-east-1_test' })
    class AppUsersAuth {}

    const { stack, module } = setupTestingStackWithModule();
    const eventApi = new EventApi(module, 'events', {
      name: 'events',
      authorizers: [AppUsersAuth],
    });

    expect(eventApi.authorizerFactory.getAuthType('app-users')).toBe(
      'AMAZON_COGNITO_USER_POOLS'
    );

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(AppsyncApi, {
      event_config: [
        expect.objectContaining({
          auth_provider: [
            {
              auth_type: 'AMAZON_COGNITO_USER_POOLS',
              cognito_config: [
                { aws_region: expect.anything(), user_pool_id: 'us-east-1_test' },
              ],
            },
          ],
        }),
      ],
    });
  });

  it('wires a lambda authorizer with the handler invoke arn', () => {
    @LambdaAuthorizer({ name: 'token-auth', authorizerResultTtlInSeconds: 30 })
    class TokenAuth {
      @AuthorizerHandler()
      authorize() {}
    }

    const { stack, module } = setupTestingStackWithModule();
    const eventApi = new EventApi(module, 'events', {
      name: 'events',
      authorizers: [TokenAuth],
    });

    expect(eventApi.authorizerFactory.getAuthType('token-auth')).toBe('AWS_LAMBDA');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(AppsyncApi, {
      event_config: [
        expect.objectContaining({
          auth_provider: [
            {
              auth_type: 'AWS_LAMBDA',
              lambda_authorizer_config: [
                {
                  authorizer_uri: 'test-authorizer-invoke-arn',
                  authorizer_result_ttl_in_seconds: 30,
                },
              ],
            },
          ],
        }),
      ],
    });
  });

  it('throws when more than one lambda authorizer is registered', () => {
    @LambdaAuthorizer({ name: 'auth-one' })
    class AuthOne {
      @AuthorizerHandler()
      authorize() {}
    }

    @LambdaAuthorizer({ name: 'auth-two' })
    class AuthTwo {
      @AuthorizerHandler()
      authorize() {}
    }

    const { module } = setupTestingStackWithModule();

    expect(
      () =>
        new EventApi(module, 'events', {
          name: 'events',
          authorizers: [AuthOne, AuthTwo],
        })
    ).toThrow('an AppSync Event API supports only one AWS_LAMBDA authorizer');
  });

  it('throws when resolving an unknown authorizer name', () => {
    const { module } = setupTestingStackWithModule();
    const eventApi = new EventApi(module, 'events', { name: 'events' });

    expect(() => eventApi.authorizerFactory.getAuthType('missing')).toThrow(
      'channel authorizer "missing" not found'
    );
  });
});
