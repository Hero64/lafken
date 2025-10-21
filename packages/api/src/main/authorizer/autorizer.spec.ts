import 'reflect-metadata';
import {
  enableBuildEnvVariable,
  getMetadataPrototypeByKey,
  getResourceMetadata,
  type LambdaMetadata,
} from '@alicanto/common';

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
      test() {}
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
  });
});
