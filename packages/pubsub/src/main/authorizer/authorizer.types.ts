import type { ResourceMetadata, ResourceProps } from '@lafken/common';

export enum ChannelAuthorizerType {
  apiKey = 'channel-api-key',
  cognito = 'channel-cognito',
  lambda = 'channel-lambda',
  iam = 'channel-iam',
}

export enum AuthorizerReflectKeys {
  handler = 'channel-authorizer::handler',
}

export interface ApiKeyAuthorizerProps extends ResourceProps {
  /** Human-readable description shown on the generated API key. */
  description?: string;
  /**
   * RFC3339 expiration timestamp for the API key.
   *
   * @default 7 days from creation, set by AppSync
   */
  expires?: string;
}

export interface CognitoAuthorizerProps extends ResourceProps {
  /**
   * Cognito User Pool id.
   *
   * The id of a Cognito User Pool resource created or loaded by
   * `@lafken/auth`'s `AuthResolver`, typically supplied via a
   * `getResourceValue()` reference.
   */
  userPoolId: string;
}

export interface LambdaAuthorizerProps extends ResourceProps {
  /**
   * Specifies the number of seconds AppSync caches the authorizer's
   * response. The Lambda function can override this per-response via
   * `ttlOverride`.
   *
   * @default 0 (disabled)
   */
  authorizerResultTtlInSeconds?: number;
}

export interface ApiKeyAuthorizerMetadata
  extends ResourceMetadata,
    Omit<ApiKeyAuthorizerProps, 'name'> {}

export interface CognitoAuthorizerMetadata
  extends ResourceMetadata,
    Omit<CognitoAuthorizerProps, 'name'> {}

export interface LambdaAuthorizerMetadata
  extends ResourceMetadata,
    Omit<LambdaAuthorizerProps, 'name'> {}

/**
 * Event passed by AppSync to the `AWS_LAMBDA` authorizer function.
 */
export interface AuthorizerHandlerEvent {
  authorizationToken: string;
  requestContext: {
    apiId: string;
    accountId: string;
    requestId: string;
    channel?: { path: string };
    operation?: 'CONNECT' | 'PUBLISH' | 'SUBSCRIBE';
  };
}

/**
 * Response expected by AppSync from the `AWS_LAMBDA` authorizer function.
 * Returned as-is, no transformation needed.
 */
export interface AuthorizerResponse {
  isAuthorized: boolean;
  resolverContext?: Record<string, unknown>;
  ttlOverride?: number;
}
