import 'cdktn/lib/testing/adapters/jest';
import { ApiGatewayApiKey } from '@cdktn/provider-aws/lib/api-gateway-api-key';
import { ApiGatewayAuthorizer } from '@cdktn/provider-aws/lib/api-gateway-authorizer';
import { ApiGatewayUsagePlan } from '@cdktn/provider-aws/lib/api-gateway-usage-plan';
import { ApiGatewayUsagePlanKey } from '@cdktn/provider-aws/lib/api-gateway-usage-plan-key';
import { CognitoUserPool } from '@cdktn/provider-aws/lib/cognito-user-pool';
import { enableBuildEnvVariable } from '@lafken/common';
import { lafkenResource } from '@lafken/resolver';
import { Testing } from 'cdktn';
import {
  ApiKeyAuthorizer,
  AuthorizerHandler,
  CognitoAuthorizer,
  CustomAuthorizer,
  Method,
} from '../../../../main';
import { setupTestingRestApi } from '../../../utils/testing.utils';

jest.mock('@lafken/resolver', () => {
  const actual = jest.requireActual('@lafken/resolver');

  return {
    ...actual,
    LambdaHandler: jest.fn().mockImplementation(() => ({
      arn: 'test-function',
      invokeArn: 'invokeArn',
    })),
  };
});

describe('authorizer factory', () => {
  enableBuildEnvVariable();

  it('should get a none authorizer properties', () => {
    const { restApi } = setupTestingRestApi();
    const properties = restApi.authorizerFactory.getAuthorizerProps({
      fullPath: '/',
      method: Method.GET,
    });

    expect(properties).toStrictEqual({
      authorization: 'NONE',
    });
  });

  it('should create an api key authorizer', () => {
    @ApiKeyAuthorizer({
      name: 'api-key-auth',
      defaultKeys: ['test-key'],
    })
    class ApiKeyAuthTest {}

    const { restApi, stack } = setupTestingRestApi({
      auth: {
        authorizers: [ApiKeyAuthTest],
        defaultAuthorizerName: 'api-key-auth',
      },
    });

    const properties = restApi.authorizerFactory.getAuthorizerProps({
      fullPath: '/',
      method: Method.GET,
      authorizer: {
        authorizerName: 'api-key-auth',
      },
    });

    const synthesized = Testing.synth(stack);

    expect(properties).toStrictEqual({ authorization: 'NONE', apiKeyRequired: true });

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayUsagePlan, {
      name: 'api-key-auth',
    });
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayApiKey, {
      name: 'test-key',
    });
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayUsagePlanKey, {
      key_type: 'API_KEY',
    });
  });

  it('should create a custom authorizer', () => {
    @CustomAuthorizer({
      name: 'custom-auth',
    })
    class CustomAuthTest {
      @AuthorizerHandler()
      handler() {}
    }

    const { restApi, stack } = setupTestingRestApi({
      auth: {
        authorizers: [CustomAuthTest],
        defaultAuthorizerName: 'custom-auth',
      },
    });

    const properties = restApi.authorizerFactory.getAuthorizerProps({
      fullPath: '/',
      method: Method.GET,
      authorizer: {
        authorizerName: 'custom-auth',
      },
    });

    const synthesized = Testing.synth(stack);

    expect(properties).toMatchObject({
      authorization: 'CUSTOM',
    });

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayAuthorizer, {
      authorizer_uri: 'invokeArn',
      type: 'REQUEST',
      name: 'custom-auth',
    });
  });

  it('should create a cognito authorizer', () => {
    @CognitoAuthorizer({
      name: 'cognito-auth',
      userPool: 'testing-user-pool',
    })
    class CognitoAuthTest {}

    const { restApi, stack } = setupTestingRestApi({
      auth: {
        authorizers: [CognitoAuthTest],
        defaultAuthorizerName: 'cognito-auth',
      },
    });

    const UserPool = lafkenResource.make(CognitoUserPool);

    const userPool = new UserPool(stack, 'testing-user-pool', {
      name: 'testing-user-pool',
    });

    userPool.isGlobal('auth', 'testing-user-pool');

    const properties = restApi.authorizerFactory.getAuthorizerProps({
      fullPath: '/',
      method: Method.GET,
      authorizer: {
        authorizerName: 'cognito-auth',
      },
    });

    const synthesized = Testing.synth(stack);

    expect(properties).toMatchObject({
      authorization: 'COGNITO_USER_POOLS',
      authorizationScopes: undefined,
    });

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayAuthorizer, {
      type: 'COGNITO_USER_POOLS',
    });
  });

  it('should get authorizers permissions', () => {
    @CustomAuthorizer({
      name: 'authorizer-permission',
    })
    class CustomAuthTest {
      @AuthorizerHandler()
      handler() {}
    }

    const { restApi } = setupTestingRestApi({
      auth: {
        authorizers: [CustomAuthTest],
        defaultAuthorizerName: 'authorizer-permission',
      },
    });

    restApi.authorizerFactory.getAuthorizerProps({
      fullPath: '/',
      method: Method.GET,
      authorizer: {
        authorizerName: 'authorizer-permission',
        scopes: ['foo', 'bar'],
      },
    });

    expect(restApi.authorizerFactory.permissions).toContainEqual({
      filename: 'authorizer.spec.ts',
      foldername: __dirname,
      pathScopes: { '/': { GET: ['foo', 'bar'] } },
    });
  });
});
