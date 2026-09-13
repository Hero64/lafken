---
title: Getting Started
description: Install Lafken and build your first serverless API.
---

## Installation

Create a new Lafken project:

```bash
npm create lafken@latest
```

Or install in an existing TypeScript project:

```bash
npm install @lafken/main @lafken/api @lafken/common
```

:::note
Lafken packages declare `cdktn`, `constructs`, and `@cdktn/provider-aws` as peer dependencies. If your package manager does not install them automatically (e.g. pnpm), add them explicitly:

```bash
npm install cdktn constructs @cdktn/provider-aws
```
:::

## System Requirements

- Node.js >= 22.13
- pnpm >= 11.14.0 (if you work inside the framework's own repository)
- TypeScript >= 5.0, with `experimentalDecorators` and `emitDecoratorMetadata` enabled

## A 5-Minute Example

Here's a complete serverless API.

### 1. Define a resource

```typescript
import { Api, Get, ApiRequest, PathParam, Event } from '@lafken/api/main';

@ApiRequest()
export class HelloRequestEvent {
  @PathParam()
  name: string;
}

@Api({
  path: '/hello',
})
export class HelloApi {
  @Get({
    path: '/{name}',
  })
  greet(@Event(HelloRequestEvent) event: HelloRequestEvent) {
    return {
      message: `Hello, ${event.name}!`,
    };
  }
}
```

### 2. Group it into a module

```typescript
import { createModule } from '@lafken/main';

export const helloModule = createModule({
  name: 'hello-module',
  resources: [HelloApi],
});
```

### 3. Create the app

```typescript
import { createApp } from '@lafken/main';
import { ApiResolver } from '@lafken/api/resolver';

createApp({
  name: 'hello-app',
  resolvers: [new ApiResolver()],
  modules: [helloModule],
});
```

That's it. Lafken generates all the AWS infrastructure for this: an API Gateway REST API, a Lambda function, IAM roles with least-privilege permissions, and the Terraform configuration for all of it.

## Where to Go Next

- [Core Concepts](/guides/core-concepts/) explains the decorator → resolver → module → app flow in more depth.
- The [Packages](/packages/main/) section documents every `@lafken/*` package's decorators and options.
- [Testing](/guides/testing/) covers how to write tests for your own decorated resources.
