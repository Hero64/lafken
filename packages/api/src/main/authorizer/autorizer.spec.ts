import 'reflect-metadata';
import fs from 'node:fs/promises';
import {
  enableBuildEnvVariable,
  getMetadataPrototypeByKey,
  getResourceMetadata,
  type LambdaMetadata,
} from '@lafken/common';
import {
  ApiKeyAuthorizer,
  AuthorizerHandler,
  CognitoAuthorizer,
  CustomAuthorizer,
} from './authorizer';
import { ApiAuthorizerType, AuthorizerReflectKeys } from './authorizer.types';

describe('Authorizers', () => {
  enableBuildEnvVariable();

  describe('Cognito Authorizer', () => {
    it('should exist cognito authorizer metadata', () => {
      @CognitoAuthorizer()
      class Auth {}

      const resource = getResourceMetadata(Auth);

      expect(resource).toBeDefined();
      expect(resource.type).toBe(ApiAuthorizerType.cognito);
    });
  });

  describe('ApiKey Authorizer', () => {
    it('should exist api key authorizer metadata', () => {
      @ApiKeyAuthorizer()
      class Auth {}

      const resource = getResourceMetadata(Auth);

      expect(resource).toBeDefined();
      expect(resource.type).toBe(ApiAuthorizerType.apiKey);
    });
  });

  describe('Custom Authorizer', () => {
    @CustomAuthorizer()
    class Auth {
      @AuthorizerHandler()
      test(_e: any) {
        return {
          principalId: 'test@test.com',
          allow: true,
        };
      }
    }
    it('should exist custom authorizer metadata', () => {
      const resource = getResourceMetadata(Auth);

      expect(resource).toBeDefined();
      expect(resource.type).toBe(ApiAuthorizerType.custom);
    });

    it('should exist test handler', () => {
      const resource = getMetadataPrototypeByKey<LambdaMetadata>(
        Auth,
        AuthorizerReflectKeys.handler
      );

      expect(resource.name).toBe('test');
    });

    it('should get permissions in lambda execution', async () => {
      jest.spyOn(fs, 'readFile').mockImplementation(() =>
        Promise.resolve(`{
        "/test": {
          "GET": ["foo", "bar"]
        }
      }`)
      );

      const auth = new Auth();

      const response = await (auth.test as any)({
        httpMethod: 'GET',
        methodArn: 'test',
        requestContext: {
          resourcePath: '/test',
        },
      });

      expect(response).toStrictEqual({
        principalId: 'test@test.com',
        policyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Action: 'execute-api:Invoke',
              Effect: 'Allow',
              Resource: 'test',
            },
          ],
        },
      });
    });
  });
});
