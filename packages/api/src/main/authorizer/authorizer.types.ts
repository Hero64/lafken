import type {
  ApiAuthorizerNames,
  AuthNames,
  ResourceMetadata,
  ResourceProps,
} from '@alicanto/common';
import type { APIGatewayRequestAuthorizerEvent } from 'aws-lambda';

import type { Method } from '../api';

export enum AuthorizerReflectKeys {
  handler = 'authorizer::handler',
}

export enum ApiAuthorizerType {
  custom = 'custom',
  cognito = 'cognito',
  apiKey = 'api-key',
}

export interface CognitoAuthorizerProps extends ResourceProps {
  /**
   * Cognito User Pool.
   *
   * Specifies the Cognito User Pool that will be used by this authorizer.
   * This User Pool is required for validating and authenticating users
   * accessing the API methods protected by this authorizer.
   */
  userPool: AuthNames;
  /**
   * Authorization header.
   *
   * Specifies the HTTP header that the authorizer will use to extract
   * the token for authentication. Typically, this is the `Authorization`
   * header, but it can be customized if needed.
   */
  header?: string;
}

export const PERMISSION_DEFINITION_FILE = 'permissions.json';

export type ApiKeyQuotaPeriod = 'day' | 'week' | 'month';

export interface AuthorizerQuota {
  /**
   *  Maximum number of requests allowed.
   *
   * Specifies the total number of requests that can be made using the API key
   * within the defined quota period.
   */
  limit: number;
  /**
   * Quota period.
   *
   * Defines the time period over which the request limit applies.
   */
  period: ApiKeyQuotaPeriod;
  /**
   * Quota offset.
   *
   * Specifies the starting point for counting requests within the period.
   * This allows scheduling the quota to start at a specific time within the period.
   */
  offset?: number;
}

export interface AuthorizerThrottle {
  /**
   * Maximum burst limit.
   *
   * Specifies the maximum number of requests that can be sent in a
   * short period of time. This allows occasional bursts of traffic
   * without exceeding the throttle rate.
   */
  burstLimit?: number;
  /**
   * Rate limit.
   *
   * Defines the steady-state number of requests allowed per second
   * for the API key. This is the normal request rate that the API
   * can handle consistently.
   */
  rateLimit?: number;
}

export interface ApiKeyAuthorizerProps {
  /**
   * Quota name.
   *
   * Specifies the name of the quota associated with the API key.
   * This helps identify and manage multiple quotas for different
   * API keys or usage plans.
   */
  name?: string;
  /**
   * API Key quota configuration.
   *
   * Defines the quota settings for the API key, controlling how many
   * requests can be made within a specified time period. This allows
   * limiting usage and protecting your API from overuse.
   */
  quota?: AuthorizerQuota;
  /**
   * API Key throttle configuration.
   *
   * Defines the throttling settings for the API key, controlling
   * the rate at which requests can be made. This helps protect
   * the API from sudden traffic spikes and ensures fair usage.
   */
  throttle?: AuthorizerThrottle;
  /**
   * Default API keys.
   *
   * Specifies a list of API keys to be created by default. These keys
   * will be automatically generated and associated with the authorizer,
   * allowing immediate access to the API without manual key creation.
   */
  defaultKeys?: string[];
}

export interface ApiKeyAuthorizerMetadata
  extends ResourceMetadata,
    Omit<ApiKeyAuthorizerProps, 'name'> {}

export interface CustomAuthorizerProps {
  /**
   * Custom authorizer name.
   *
   * Specifies the name of the custom authorizer resource. This name
   * is used to identify and reference the authorizer within the API
   * and resolvers.
   */
  name?: ApiAuthorizerNames;
  /**
   * Authorization header.
   *
   * Specifies the HTTP header that the authorizer will use to extract
   * the token for authentication. Typically, this is the `Authorization`
   * header, but it can be customized if needed.
   */
  header?: string;
}

export interface AuthorizationHandlerEvent extends APIGatewayRequestAuthorizerEvent {
  /**
   * Permissions for the authorizer event.
   *
   * Contains the list of permissions defined for the API method that
   * triggered the authorizer. These permissions are passed to the
   * Lambda handler to determine whether the request should be allowed
   * or denied.
   */
  permissions: string[];
}

export interface AuthorizerResponse {
  /**
   * Principal identifier.
   *
   * Specifies the identifier of the authenticated entity. This is
   * typically the user's email, username, or a custom unique identifier.
   * It represents the principal that has been authorized to access the API.
   */
  principalId: string;
  /**
   * Indicates whether the authenticated principal is allowed to access
   * the API method. A value of `true` means the request is authorized,
   * while `false` denies access.
   */
  allow: boolean;
}

export interface CustomAuthorizerHandler {
  handler: (e: AuthorizationHandlerEvent) => AuthorizerResponse;
}
/**
 * {
 *  "path": {
 *    [METHOD]: ["permission"]
 *  }
 * }
 */
export type PermissionContent = Record<string, Partial<Record<Method, string[]>>>;

export interface CustomAuthorizerMetadata
  extends ResourceMetadata,
    Omit<CustomAuthorizerProps, 'name'> {}

export interface CognitoAuthorizerMetadata
  extends ResourceMetadata,
    Omit<CognitoAuthorizerProps, 'name'> {}
