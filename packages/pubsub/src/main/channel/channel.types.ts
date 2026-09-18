import type { LambdaMetadata, ResourceMetadata, ResourceProps } from '@lafken/common';

export const RESOURCE_TYPE = 'channel';

export enum ChannelOperation {
  publish = 'publish',
  subscribe = 'subscribe',
}

export interface ChannelAuthorizer {
  /**
   * Authorizer name.
   *
   * References the name of a `@CognitoAuthorizer`, `@LambdaAuthorizer` or
   * `@ApiKeyAuthorizer` resource passed to the `PubSubResolver`.
   */
  authorizerName: string;
}

export interface ChannelProps extends ResourceProps {
  /**
   * Channel namespace.
   *
   * Groups the channels handled by this class under an AppSync Events
   * namespace. Clients subscribe/publish to channels using the
   * `<namespace>/<channel>` path.
   *
   * @default the resource name
   */
  namespace?: string;
  /**
   * Event API name.
   *
   * References which Event API, configured in the `PubSubResolver`, this
   * namespace belongs to. Required only when the resolver manages more than
   * one Event API.
   */
  eventApiName?: string;
  /**
   * Authorizer applied to both publishing and subscribing on this namespace.
   *
   * Overrides the Event API's default authorization modes. Ignored for an
   * operation that also defines its own `publishAuth`/`subscribeAuth`. Pass
   * `false` to always inherit every registered authorizer, bypassing the
   * resolver's `defaultAuthorizerName` if one is configured.
   *
   * @default the resolver's `defaultAuthorizerName`, if configured;
   * otherwise every registered authorizer
   */
  auth?: ChannelAuthorizer | false;
  /**
   * Authorizer applied when publishing to this namespace.
   * Overrides `auth` for the publish operation.
   */
  publishAuth?: ChannelAuthorizer | false;
  /**
   * Authorizer applied when subscribing to this namespace.
   * Overrides `auth` for the subscribe operation.
   */
  subscribeAuth?: ChannelAuthorizer | false;
}

export interface ChannelResourceMetadata extends ResourceMetadata {
  namespace?: string;
  eventApiName?: string;
  auth?: ChannelAuthorizer | false;
  publishAuth?: ChannelAuthorizer | false;
  subscribeAuth?: ChannelAuthorizer | false;
}

export interface ChannelLambdaMetadata extends LambdaMetadata {
  operation: ChannelOperation;
}
