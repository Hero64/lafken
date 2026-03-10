import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  createResourceDecorator,
  isBuildEnvironment,
  type LambdaMetadata,
} from '@lafken/common';
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

/**
 * Class decorator that registers a Cognito-based authorizer.
 *
 * Configures API Gateway to validate incoming requests using an
 * Amazon Cognito User Pool. Tokens sent in the specified header
 * are verified automatically — no custom Lambda logic is needed.
 *
 * @example
 * ```ts
 * @CognitoAuthorizer({
 *   userPool: 'my-user-pool',
 *   header: 'Authorization',
 *   authorizerResultTtlInSeconds: 300,
 * })
 * export class MyCognitoAuth {}
 * ```
 *
 * @param props - Cognito authorizer options (userPool, header, TTL).
 */
export const CognitoAuthorizer = createResourceDecorator<CognitoAuthorizerProps>({
  type: ApiAuthorizerType.cognito,
});

/**
 * Class decorator that registers an API Key authorizer.
 *
 * Protects API endpoints by requiring a valid API key in each request.
 * Optionally configures quota limits and throttling to control usage.
 *
 * @example
 * ```ts
 * @ApiKeyAuthorizer({
 *   quota: { limit: 1000, period: 'month' },
 *   throttle: { burstLimit: 50, rateLimit: 100 },
 *   defaultKeys: ['my-default-key'],
 * })
 * export class MyApiKeyAuth {}
 * ```
 *
 * @param props - API key authorizer options (quota, throttle, defaultKeys).
 */
export const ApiKeyAuthorizer = createResourceDecorator<ApiKeyAuthorizerProps>({
  type: ApiAuthorizerType.apiKey,
});

/**
 * Class decorator that registers a custom Lambda authorizer.
 *
 * Creates a request-based authorizer backed by a Lambda function.
 * Use the `@AuthorizerHandler` decorator on a method inside the class
 * to define the authorization logic that evaluates each incoming request.
 *
 * @example
 * ```ts
 * @CustomAuthorizer({
 *   header: 'Authorization',
 *   authorizerResultTtlInSeconds: 60,
 * })
 * export class MyCustomAuth {
 *   @AuthorizerHandler()
 *   authorize(event: AuthorizationHandlerEvent): AuthorizerResponse {
 *     return { principalId: 'user-id', allow: true };
 *   }
 * }
 * ```
 *
 * @param props - Custom authorizer options (header, TTL).
 */
export const CustomAuthorizer = createResourceDecorator<CustomAuthorizerProps>({
  type: ApiAuthorizerType.custom,
});

/**
 * Method decorator that marks a method as the authorization handler
 * for a `@CustomAuthorizer`.
 *
 * The decorated method receives an `AuthorizationHandlerEvent` — the
 * standard API Gateway request authorizer event enriched with the
 * `permissions` array defined on each protected route — and must return
 * an `AuthorizerResponse` indicating whether the request is allowed.
 *
 * At build time the decorator stores handler metadata; at runtime it
 * wraps the method to load the route permission definitions and build
 * the IAM policy document expected by API Gateway.
 *
 * @example
 * ```ts
 * @CustomAuthorizer({ header: 'Authorization' })
 * export class MyAuth {
 *   @AuthorizerHandler()
 *   async authorize(event: AuthorizationHandlerEvent): Promise<AuthorizerResponse> {
 *     const isValid = verifyToken(event.headers.Authorization);
 *     return { principalId: 'user', allow: isValid };
 *   }
 * }
 * ```
 *
 * @param props - Optional Lambda metadata overrides (memory, timeout, etc.).
 */
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
      let accessRules: PermissionContent = {};
      try {
        accessRules = (JSON.parse(
          await readFile(join(__dirname, PERMISSION_DEFINITION_FILE), 'utf-8')
        ) || {}) as PermissionContent;
      } catch {}

      const allowedGroups = accessRules[event.requestContext.resourcePath];

      const response: AuthorizerResponse = await originalValue.apply(this, [
        {
          ...event,
          permissions: allowedGroups?.[event.httpMethod as unknown as Method] || [],
        },
      ]);

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
