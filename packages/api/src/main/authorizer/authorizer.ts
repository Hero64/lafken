import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  createResourceDecorator,
  isBuildEnvironment,
  type LambdaMetadata,
} from '@alicanto/common';
import type { APIGatewayRequestAuthorizerEvent } from 'aws-lambda';

import type { Method } from '../api';
import {
  ApiAuthorizerType,
  type ApiKeyAuthorizerProps,
  AuthorizerReflectKeys,
  type AuthorizerResponse,
  type CognitoAuthorizerProps,
  type CustomAuthorizerProps,
  PERMISSION_DEFINITION_FILE,
  type PermissionContent,
} from './authorizer.types';

export const CognitoAuthorizer = createResourceDecorator<CognitoAuthorizerProps>({
  type: ApiAuthorizerType.cognito,
});

export const ApiKeyAuthorizer = createResourceDecorator<ApiKeyAuthorizerProps>({
  type: ApiAuthorizerType.apiKey,
});

export const CustomAuthorizer = createResourceDecorator<CustomAuthorizerProps>({
  type: ApiAuthorizerType.custom,
});

export const AuthorizerHandler =
  (props: Partial<LambdaMetadata> = {}) =>
  (target: any, methodName: string, descriptor: PropertyDescriptor) => {
    if (isBuildEnvironment()) {
      Reflect.defineMetadata(
        AuthorizerReflectKeys.handler,
        {
          ...props,
          name: methodName,
        },
        target
      );
    }

    const { value: originalValue } = descriptor;

    descriptor.value = async (event: APIGatewayRequestAuthorizerEvent) => {
      const accessRules: PermissionContent = JSON.parse(
        await readFile(join(__dirname, PERMISSION_DEFINITION_FILE), 'utf-8')
      );

      const allowedGroups = accessRules[event.requestContext.resourcePath];

      const response: AuthorizerResponse = await originalValue.apply(this, {
        ...event,
        permissions: allowedGroups?.[event.headers as unknown as Method] || [],
      });

      return {
        principalId: response.principalId,
        policyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Action: 'execute-api:Invoke',
              Effect: response.allow ? 'Allow' : 'Deny',
              Resource: event.methodArn,
            },
          ],
        },
      };
    };
  };
