# @lafken/pubsub

Define AWS AppSync Events channels and publish/subscribe handlers with TypeScript decorators. Lafken generates the Event API, channel namespaces, Lambda data sources, and authorization from your code.

## Installation

```bash
npm install @lafken/pubsub
```

> [!NOTE]
> Like every Lafken package, `@lafken/pubsub` declares `cdktn`, `constructs`, and `@cdktn/provider-aws` as peer dependencies. Install them explicitly if your package manager doesn't do it for you (e.g. pnpm):
>
> ```bash
> npm install cdktn constructs @cdktn/provider-aws
> ```

## Key Features

- **Decorator-Based Channels**: Declare a channel namespace with `@Channel` and its handlers with `@OnPublish`/`@OnSubscribe`
- **Direct Lambda Integration**: Each handler compiles to its own Lambda, invoked synchronously by AppSync (no VTL/JS resolver code to write)
- **Authorization Parity with `@lafken/api`**: `@ApiKeyAuthorizer`, `@CognitoAuthorizer`, `@LambdaAuthorizer`, and `@IamAuthorizer`
- **Runtime Publish Client**: `PubSubService.publish()` to publish events from any Lambda, with header-based or SigV4-signed (`AWS_IAM`) authorization

## Quick Example

### 1. Define a Channel

```ts
import { Channel, OnPublish, OnSubscribe, Event } from '@lafken/pubsub/main';

@Channel({ namespace: 'chat' })
export class ChatChannel {
  @OnPublish()
  onMessage(@Event() event: any) {
    // Transform or validate the payload before it reaches subscribers.
    // Returning nothing keeps the events unchanged; returning `null` drops them.
    return event.events;
  }

  @OnSubscribe()
  onJoin(@Event() event: any) {
    // Throw to reject the subscription (e.g. unauthorized channel path).
  }
}
```

### 2. Register the Resolver

```ts
import { createApp } from '@lafken/main';
import { PubSubResolver } from '@lafken/pubsub/resolver';

createApp({
  name: 'chat-app',
  resolvers: [new PubSubResolver()],
  modules: [chatModule],
});
```

With no arguments, `PubSubResolver` creates a single Event API secured with an `API_KEY` authorizer — enough to get started.

### 3. Publish from Any Lambda

```ts
import { PubSubService } from '@lafken/pubsub/service';

await PubSubService.publish({
  httpDomain: process.env.EVENTS_HTTP_DOMAIN!,
  channel: '/chat/room-1',
  events: [{ message: 'hello' }],
  auth: { type: 'headers', headers: { 'x-api-key': process.env.EVENTS_API_KEY! } },
});
```

Wire `EVENTS_HTTP_DOMAIN` from the generated Event API via `getResourceValue`:

```ts
@Api({ path: '/messages' })
export class MessagesApi {
  @Post({
    lambda: {
      env: ({ getResourceValue }) => ({
        EVENTS_HTTP_DOMAIN: getResourceValue('event-api::chat-app-events', 'httpDomain'),
      }),
    },
  })
  send() { /* ... */ }
}
```

## Authorization

Authorizers are separate decorated classes, registered on the resolver and referenced by name — the same pattern as `@lafken/api`.

```ts
import { ApiKeyAuthorizer, CognitoAuthorizer, LambdaAuthorizer, IamAuthorizer, AuthorizerHandler } from '@lafken/pubsub/main';

@ApiKeyAuthorizer({ name: 'public-key' })
export class PublicKeyAuth {}

@CognitoAuthorizer({
  name: 'app-users',
  userPoolId: ({ getResourceValue }) => getResourceValue('user-pool::app', 'id'),
})
export class AppUsersAuth {}

@LambdaAuthorizer({ name: 'token-auth' })
export class TokenAuth {
  @AuthorizerHandler()
  authorize(event) {
    return { isAuthorized: event.authorizationToken === 'secret' };
  }
}

// Recommended for backend publishers — pairs with `PubSubService.publish({ auth: { type: 'iam' } })`.
@IamAuthorizer({ name: 'backend-auth' })
export class BackendAuth {}
```

```ts
new PubSubResolver({
  name: 'chat-app-events',
  authorizers: [PublicKeyAuth, AppUsersAuth, TokenAuth, BackendAuth],
});
```

An Event API supports only one `AWS_LAMBDA` authorizer at a time (an AWS AppSync Events limit). By default every registered authorizer is allowed for connecting, publishing, and subscribing; override per channel with `auth`, `publishAuth`, or `subscribeAuth`:

```ts
@Channel({ namespace: 'private-room', auth: { authorizerName: 'app-users' } })
export class PrivateRoom {
  @OnPublish()
  onMessage(@Event() event: any) {}
}
```

To restrict channels to a single authorizer by default — instead of every registered one — set `defaultAuthorizerName` on the resolver. Channels that don't declare their own `auth`/`publishAuth`/`subscribeAuth` fall back to it; pass `auth: false` on a channel to opt back out and inherit every registered authorizer:

```ts
new PubSubResolver({
  name: 'chat-app-events',
  authorizers: [PublicKeyAuth, AppUsersAuth, TokenAuth, BackendAuth],
  defaultAuthorizerName: 'app-users',
});
```

## Multiple Event APIs

Pass one or more options to `PubSubResolver` and set `eventApiName` on each `@Channel` to route it to the right one:

```ts
new PubSubResolver(
  { name: 'public-events' },
  { name: 'internal-events', authorizers: [BackendAuth] }
);
```

```ts
@Channel({ namespace: 'chat', eventApiName: 'public-events' })
export class ChatChannel {}
```

## Not Supported: `OnUnsubscribe`

AWS AppSync Events only invokes a Lambda for the `OnPublish` and `OnSubscribe` handlers — there is no server-side hook for unsubscribe or disconnect events; the client's `stop` message is handled entirely by AppSync. If you need to react to a client leaving a channel, model it as an explicit `OnPublish` to a control channel, or export the Event API's CloudWatch access logs (not yet wired up by this package) for asynchronous auditing.

## Package Structure

- `@lafken/pubsub/main` — decorators used in application code (`@Channel`, `@OnPublish`, `@OnSubscribe`, `@Event`, `@Context`, authorizers)
- `@lafken/pubsub/resolver` — `PubSubResolver`, passed to `createApp({ resolvers: [...] })`
- `@lafken/pubsub/service` — `PubSubService`, the runtime client for publishing events from any Lambda

## License

MIT License - see the root [LICENSE](../../LICENSE) file for details.
