import 'reflect-metadata';
import { enableBuildEnvVariable, ResourceReflectKeys } from '@lafken/common';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  ApiKeyAuthorizer,
  AuthorizerHandler,
  CognitoAuthorizer,
  IamAuthorizer,
  LambdaAuthorizer,
} from './authorizer';
import { AuthorizerReflectKeys, ChannelAuthorizerType } from './authorizer.types';

describe('Channel authorizer decorators', () => {
  beforeAll(() => {
    enableBuildEnvVariable();
  });

  it('registers an api key authorizer resource', () => {
    @ApiKeyAuthorizer({ description: 'public key' })
    class PublicKeyAuth {}

    const metadata = Reflect.getMetadata(ResourceReflectKeys.resource, PublicKeyAuth);

    expect(metadata.type).toBe(ChannelAuthorizerType.apiKey);
    expect(metadata.description).toBe('public key');
  });

  it('registers a cognito authorizer resource', () => {
    @CognitoAuthorizer({ userPoolId: () => 'us-east-1_test' })
    class AppUsersAuth {}

    const metadata = Reflect.getMetadata(ResourceReflectKeys.resource, AppUsersAuth);

    expect(metadata.type).toBe(ChannelAuthorizerType.cognito);
    expect(metadata.userPoolId()).toBe('us-east-1_test');
  });

  it('registers a lambda authorizer resource and its handler', () => {
    @LambdaAuthorizer({ authorizerResultTtlInSeconds: 60 })
    class TokenAuth {
      @AuthorizerHandler()
      authorize() {
        return { isAuthorized: true };
      }
    }

    const metadata = Reflect.getMetadata(ResourceReflectKeys.resource, TokenAuth);
    const handler = Reflect.getMetadata(
      AuthorizerReflectKeys.handler,
      TokenAuth.prototype
    );

    expect(metadata.type).toBe(ChannelAuthorizerType.lambda);
    expect(metadata.authorizerResultTtlInSeconds).toBe(60);
    expect(handler).toEqual({ name: 'authorize' });
  });

  it('registers an iam authorizer resource', () => {
    @IamAuthorizer({ name: 'backend-auth' })
    class BackendAuth {}

    const metadata = Reflect.getMetadata(ResourceReflectKeys.resource, BackendAuth);

    expect(metadata.type).toBe(ChannelAuthorizerType.iam);
  });

  it('does not wrap the handler at runtime', () => {
    class TokenAuth {
      @AuthorizerHandler()
      authorize(event: { authorizationToken: string }) {
        return { isAuthorized: event.authorizationToken === 'secret' };
      }
    }

    const instance = new TokenAuth();

    expect(instance.authorize({ authorizationToken: 'secret' })).toEqual({
      isAuthorized: true,
    });
  });
});
