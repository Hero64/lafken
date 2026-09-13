---
title: Core Concepts
description: How decorators, resolvers, modules and apps fit together in Lafken.
---

Lafken works through four kinds of building blocks:

```
TypeScript code (with decorators)
    ↓
Module (groups resources)
    ↓
App + Resolvers (process the decorators)
    ↓
Terraform configuration (generated automatically)
```

## Decorators

`@Api`, `@Get`, `@Queue`, `@StateMachine`, and every other resource decorator mark a class or method as an infrastructure resource. They are built with `createResourceDecorator()` or `createLambdaDecorator()` from [`@lafken/common`](/packages/common/), and each one captures metadata via reflection:

- `type` — matched against a registered resolver's identifier
- `filename` / `foldername` — used for Lambda bundling
- `originalName` — the original class name, used for asset naming

## Resolvers

A resolver implements the `ResolverType` interface — one per AWS service package (`ApiResolver`, `QueueResolver`, `DynamoResolver`, ...). Each has three lifecycle hooks, called in this order:

1. **`beforeCreate(scope)`** — create resources shared across the whole app (e.g. a single IAM role reused by every Lambda of that resolver's kind)
2. **`create(module, resource)`** — process each decorated resource found in the module
3. **`afterCreate(scope)`** — wire up integrations that depend on resources having already been created (e.g. connecting an event rule to the Lambda it triggers)

Resolvers inspect decorated classes through `getResourceMetadata()` / `getResourceHandlerMetadata()`, both exported from `@lafken/common`.

If you need to support an AWS service that has no resolver yet, see [Adding a Resource Type](/guides/adding-a-resource-type/) — or read [`@lafken/resolver`](/packages/resolver/), which is the package built for exactly that.

## Modules and Apps

A **module** (`createModule`, from `@lafken/main`) groups resources that share configuration — memory, timeout, runtime, services — under one name. An **app** (`createApp`) registers the modules and resolvers together and synthesizes the resulting Terraform configuration through CDKTN.

A decorator's `type` must match a resolver registered in `createApp({ resolvers: [...] })`, or the resource it decorates is silently unhandled — nothing is generated for it, and nothing errors either. If a resource you defined doesn't show up in the synthesized output, this is the first thing to check.

## Cross-Resource References

Resources register themselves globally with `isGlobal(module, id)` and can be referenced from anywhere else in the app with `getResourceValue('scope::resourceId', 'arn')`:

```typescript
@Api({ path: '/users' })
export class UserApi {
  @Get({
    path: '/{id}',
    lambda: {
      env: ({ getResourceValue, getSSMValue }) => ({
        // Static value
        APP_NAME: 'my-app',

        // Environment variable, resolved when the app is built
        DEBUG: process.env.DEBUG || 'false',

        // Dynamic reference to another resource
        TABLE_NAME: getResourceValue('dynamo::users', 'name'),

        // AWS Systems Manager Parameter Store
        API_KEY: getSSMValue('/my-app/api-key'),
      }),
    },
  })
  getUser() {
    /* ... */
  }
}
```

`getResourceValue` is implemented by `lafkenResource.make()` in `@lafken/resolver`, and every reference is validated by `resolveCallbackResource()` before deployment — a typo in a resource id fails at synth, not at runtime.

### Type-Safe Resource References

Enable autocomplete for these string references by extending two interfaces from `@lafken/common` in a `lafken-types.d.ts` at your project root:

- **`SharedResourceNames`** — resources this application defines and owns
- **`SharedReferenceResources`** — resources from external stacks this application only references

```typescript
declare module '@lafken/common' {
  interface SharedResourceNames {
    api: 'my-api';
    'api-authorizer': 'cognito-auth' | 'custom-auth';
    lambda: 'my-function';
    queue: 'my-queue';
    bucket: 'my-bucket';
    dynamo: 'my-table';
    'state-machine': 'my-workflow';
    'user-pool': 'my-user-pool';
    'user-pool-client': 'my-user-pool-client';
  }

  interface SharedReferenceResources {
    dynamo: 'shared-table';
    queue: 'shared-queue';
    'user-pool': 'shared-user-pool';
    'state-machine': 'shared-workflow';
    'event-bus': 'shared-event-bus';
    'event-rule': 'shared-event-rule';
    schedule: 'shared-schedule';
    lambda: 'shared-function';
  }
}

export {};
```

Each key is a resource scope; the value is a union of the valid names for that scope. Only declare the scopes your application actually uses. With this in place:

```typescript
getResourceValue('dynamo::my-table', 'arn'); // ✓ TypeScript knows this is valid
getResourceValue('dynamo::invalid', 'arn'); // ✗ TypeScript error
```
