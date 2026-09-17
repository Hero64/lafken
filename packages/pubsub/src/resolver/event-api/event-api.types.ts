import type { ClassResource } from '@lafken/common';

export interface EventApiOptions {
  /**
   * Event API name.
   *
   * Must match the `eventApiName` used by `@Channel` resources when a
   * `PubSubResolver` manages more than one Event API.
   */
  name: string;
  /** Contact information for the API owner, shown to AWS support. */
  ownerContact?: string;
  /** Tags applied to the Event API. */
  tags?: Record<string, string>;
  /**
   * Classes decorated with `@ApiKeyAuthorizer`, `@CognitoAuthorizer` or
   * `@LambdaAuthorizer` that authorize this Event API.
   *
   * @default a single `API_KEY` authorizer
   */
  authorizers?: ClassResource[];
  /**
   * Name of a registered authorizer (see `authorizers`) applied to any
   * `@Channel` that doesn't declare its own `auth`/`publishAuth`/`subscribeAuth`.
   *
   * @default none — such channels inherit every registered authorizer
   */
  defaultAuthorizerName?: string;
}
