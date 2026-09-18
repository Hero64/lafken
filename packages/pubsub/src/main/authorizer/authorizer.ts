import {
  createResourceDecorator,
  isBuildEnvironment,
  type LambdaMetadata,
  type ResourceProps,
} from '@lafken/common';
import {
  type ApiKeyAuthorizerProps,
  AuthorizerReflectKeys,
  ChannelAuthorizerType,
  type CognitoAuthorizerProps,
  type LambdaAuthorizerProps,
} from './authorizer.types';

/**
 * Class decorator that registers an API Key authorizer for an Event API.
 *
 * When no authorizer is registered for a `PubSubResolver`, this is the
 * implicit default.
 */
export const ApiKeyAuthorizer = createResourceDecorator<ApiKeyAuthorizerProps>({
  type: ChannelAuthorizerType.apiKey,
});

/**
 * Class decorator that registers a Cognito User Pool authorizer for an
 * Event API.
 *
 * @example
 * ```ts
 * @CognitoAuthorizer({ userPoolId: ({ getResourceValue }) => getResourceValue('user-pool::app', 'id') })
 * export class AppUserPoolAuth {}
 * ```
 */
export const CognitoAuthorizer = createResourceDecorator<CognitoAuthorizerProps>({
  type: ChannelAuthorizerType.cognito,
});

/**
 * Class decorator that registers a Lambda authorizer for an Event API.
 *
 * Use the `@AuthorizerHandler` decorator on a method inside the class to
 * define the authorization logic. An Event API supports only one
 * `AWS_LAMBDA` authorizer.
 *
 * @example
 * ```ts
 * @LambdaAuthorizer({ authorizerResultTtlInSeconds: 60 })
 * export class TokenAuth {
 *   @AuthorizerHandler()
 *   authorize(event: AuthorizerHandlerEvent): AuthorizerResponse {
 *     return { isAuthorized: event.authorizationToken === 'secret' };
 *   }
 * }
 * ```
 */
export const LambdaAuthorizer = createResourceDecorator<LambdaAuthorizerProps>({
  type: ChannelAuthorizerType.lambda,
});

/**
 * Class decorator that registers an IAM authorizer for an Event API.
 *
 * Grants publish/subscribe/connect access to any caller whose IAM
 * credentials are allowed by policy — the recommended mode for backend
 * processes such as a Lambda publishing with `PubSubService.publish({ auth: { type: 'iam' } })`.
 * Requires no extra configuration.
 *
 * @example
 * ```ts
 * @IamAuthorizer()
 * export class BackendAuth {}
 * ```
 */
export const IamAuthorizer = createResourceDecorator<ResourceProps>({
  type: ChannelAuthorizerType.iam,
});

/**
 * Method decorator that marks a method as the authorization handler for a
 * `@LambdaAuthorizer`.
 *
 * Unlike API Gateway's custom authorizer, AppSync invokes this Lambda
 * directly and uses its `AuthorizerResponse` as-is, so no runtime
 * wrapping is required — only build-time handler metadata is recorded.
 */
export const AuthorizerHandler =
  (props: Partial<LambdaMetadata> = {}) =>
  (target: any, methodName: string) => {
    if (isBuildEnvironment()) {
      Reflect.defineMetadata(
        AuthorizerReflectKeys.handler,
        { ...props, name: methodName },
        target
      );
    }
  };
