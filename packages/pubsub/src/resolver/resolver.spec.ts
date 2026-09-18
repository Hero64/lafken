import { AppsyncApi } from '@cdktn/provider-aws/lib/appsync-api';
import { AppsyncChannelNamespace } from '@cdktn/provider-aws/lib/appsync-channel-namespace';
import { AppsyncDatasource } from '@cdktn/provider-aws/lib/appsync-datasource';
import { enableBuildEnvVariable } from '@lafken/common';
import {
  type AppModule,
  type AppStack,
  LambdaHandler,
  setupTestingStackWithModule,
} from '@lafken/resolver';
import { Testing } from 'cdktn';
import { describe, expect, it, vi } from 'vitest';
import {
  ApiKeyAuthorizer,
  Channel,
  CognitoAuthorizer,
  IamAuthorizer,
  OnPublish,
  OnSubscribe,
} from '../main';
import { PubSubResolver } from './resolver';

vi.mock('@lafken/resolver', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lafken/resolver')>();

  return {
    ...actual,
    LambdaHandler: vi.fn().mockImplementation(function (this: any) {
      this.arn = 'test-function-arn';
      this.invokeArn = 'test-function-invoke-arn';
    }),
  };
});

describe('channel resolver', () => {
  enableBuildEnvVariable();

  it('creates a default API_KEY event api when no options are given', () => {
    const { stack, module } = setupTestingStackWithModule();
    const resolver = new PubSubResolver();

    resolver.beforeCreate(module as unknown as AppStack);

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(AppsyncApi, {
      name: 'test-events',
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

  it('creates a channel namespace with publish and subscribe handlers', () => {
    @Channel({ namespace: 'chat' })
    class ChatChannel {
      @OnPublish()
      onMessage() {}

      @OnSubscribe()
      onJoin() {}
    }

    const { stack, module } = setupTestingStackWithModule();
    const resolver = new PubSubResolver();

    resolver.beforeCreate(module as unknown as AppStack);
    resolver.create(module as unknown as AppModule, ChatChannel);

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(AppsyncChannelNamespace, {
      name: 'chat',
      handler_configs: [
        {
          on_publish: [
            {
              behavior: 'DIRECT',
              integration: [
                {
                  data_source_name: 'chat_publish',
                  lambda_config: [{ invoke_type: 'REQUEST_RESPONSE' }],
                },
              ],
            },
          ],
          on_subscribe: [
            {
              behavior: 'DIRECT',
              integration: [
                {
                  data_source_name: 'chat_subscribe',
                  lambda_config: [{ invoke_type: 'REQUEST_RESPONSE' }],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(synthesized).toHaveResourceWithProperties(AppsyncDatasource, {
      name: 'chat_publish',
      type: 'AWS_LAMBDA',
      lambda_config: { function_arn: 'test-function-arn' },
    });

    const resources = JSON.parse(synthesized).resource;
    const namespace = Object.entries<{ depends_on: string[] }>(
      resources.aws_appsync_channel_namespace
    )[0][1];
    const dataSourceIds = Object.keys(resources.aws_appsync_datasource);

    // Regression guard: AppSync rejects channel namespace creation with
    // "DataSource not found" when the namespace isn't told to wait for its
    // data sources — the reference is a plain string, so Terraform can't
    // infer the dependency on its own.
    expect(dataSourceIds).toHaveLength(2);
    for (const id of dataSourceIds) {
      expect(namespace.depends_on).toContain(`aws_appsync_datasource.${id}`);
    }

    expect(LambdaHandler).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ name: 'onMessage', operation: 'publish' })
    );
  });

  it('overrides the namespace auth mode with a registered authorizer', () => {
    @ApiKeyAuthorizer({ name: 'public-key' })
    class PublicKeyAuth {}

    @CognitoAuthorizer({
      name: 'app-users',
      userPoolId: () => 'us-east-1_test',
    })
    class AppUsersAuth {}

    @Channel({ namespace: 'private-room', auth: { authorizerName: 'app-users' } })
    class PrivateRoom {
      @OnPublish()
      onMessage() {}
    }

    const { stack, module } = setupTestingStackWithModule();
    const resolver = new PubSubResolver({
      name: 'events-api',
      authorizers: [PublicKeyAuth, AppUsersAuth],
    });

    resolver.beforeCreate(module as unknown as AppStack);
    resolver.create(module as unknown as AppModule, PrivateRoom);

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(AppsyncChannelNamespace, {
      name: 'private-room',
      publish_auth_mode: [{ auth_type: 'AMAZON_COGNITO_USER_POOLS' }],
      subscribe_auth_mode: [{ auth_type: 'AMAZON_COGNITO_USER_POOLS' }],
    });

    expect(synthesized).toHaveResourceWithProperties(AppsyncApi, {
      name: 'events-api',
      event_config: [
        expect.objectContaining({
          auth_provider: [
            { auth_type: 'API_KEY' },
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

  it('applies the defaultAuthorizerName to channels without an explicit auth', () => {
    @ApiKeyAuthorizer({ name: 'public-key' })
    class PublicKeyAuth {}

    @IamAuthorizer({ name: 'backend-auth' })
    class BackendAuth {}

    @Channel({ namespace: 'chat' })
    class ChatChannel {
      @OnPublish()
      onMessage() {}
    }

    const { stack, module } = setupTestingStackWithModule();
    const resolver = new PubSubResolver({
      name: 'events-api',
      authorizers: [PublicKeyAuth, BackendAuth],
      defaultAuthorizerName: 'backend-auth',
    });

    resolver.beforeCreate(module as unknown as AppStack);
    resolver.create(module as unknown as AppModule, ChatChannel);

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(AppsyncChannelNamespace, {
      name: 'chat',
      publish_auth_mode: [{ auth_type: 'AWS_IAM' }],
      subscribe_auth_mode: [{ auth_type: 'AWS_IAM' }],
    });
  });

  it('throws when more than one event api is configured and eventApiName is missing', () => {
    @Channel({ namespace: 'chat' })
    class ChatChannel {
      @OnPublish()
      onMessage() {}
    }

    const { module } = setupTestingStackWithModule();
    const resolver = new PubSubResolver({ name: 'api-one' }, { name: 'api-two' });

    resolver.beforeCreate(module as unknown as AppStack);

    expect(() =>
      resolver.create(module as unknown as AppModule, ChatChannel)
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: must specify the eventApiName of the resource in module test]`
    );
  });
});
