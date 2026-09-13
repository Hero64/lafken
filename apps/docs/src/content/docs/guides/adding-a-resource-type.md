---
title: Adding a Resource Type
description: How to support a new AWS service with your own Lafken resolver.
---

Every AWS service Lafken supports — API Gateway, SQS, DynamoDB, Step Functions, and the rest — follows the same shape: a decorator factory paired with a resolver. Adding support for a new one, or a custom integration specific to your app, means building the same pair.

[`@lafken/resolver`](/packages/resolver/) is the package built for exactly this: it provides `ResolverType`, infrastructure primitives (`LambdaHandler`, `Role`, `Environment`), and `lafkenResource` for global resource tracking.

## 1. Define the Decorator

Build it in `packages/{service}/src/main/` (or anywhere in your own app) with `createResourceDecorator()` or `createLambdaDecorator()` from [`@lafken/common`](/packages/common/):

```typescript
import { createResourceDecorator } from '@lafken/common';

export interface TopicProps {
  name?: string;
}

export const Topic = (props: TopicProps = {}) =>
  createResourceDecorator({
    type: 'sns-topic',
    ...props,
  });
```

The `type` string is what connects this decorator to a resolver — pick one that doesn't collide with an existing resolver's `type`.

## 2. Implement the Resolver

```typescript
import type { ResolverType } from '@lafken/resolver';

export class TopicResolver implements ResolverType {
  type = 'sns-topic';

  async beforeCreate(scope) {
    // Resources shared across every decorated class this resolver handles.
  }

  async create(module, resource) {
    // Runs once per decorated class found in the module.
  }

  async afterCreate(scope) {
    // Wiring that depends on every resource already existing —
    // e.g. connecting this resolver's output to another resolver's resource.
  }
}
```

See [Core Concepts](/guides/core-concepts/#resolvers) for what each hook is for and the order they run in.

## 3. Write Tests

Assert against the Terraform your resolver actually generates rather than only calling its methods — see [Testing a Custom Resolver](/guides/testing/#testing-a-custom-resolver) for the full pattern with `setupTestingStack()` and `@cdktn/vitest`'s matchers. Remember `enableBuildEnvVariable()` before declaring any decorated class in the test file.

## 4. Register It

A decorator's `type` only takes effect once its resolver is registered:

```typescript
createApp({
  resolvers: [new TopicResolver(), /* ...the rest of your app's resolvers */],
});
```

Forgetting this step is the most common reason a decorated resource produces no infrastructure at all: unmatched `type` values fail silently, with nothing generated and nothing reported as an error.
