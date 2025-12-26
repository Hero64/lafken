# Lafken

Lafken is a lightweight framework for building serverless applications on AWS with minimal infrastructure overhead.
Instead of manually orchestrating resources, Lafken uses CDK for Terraform (CDKTF) under the hood to generate, synthesize, and manage all AWS infrastructure defined in your modules.

You focus on writing your application logic. Lafken takes care of the infrastructure

## Features

* Simple and modular structure
* Easy creation of serverless APIs and other resources
* No infrastructure knowledge required
* Works well for small or large projects
* Extensible through modules and resolvers

## Installation

```bash
npm install @lafken/main
```

## Quick Example

### Create an application

```ts
import { ApiResolver } from '@lafken/api/resolver';

createApp({
  name: 'awesome-app',
  resolvers: [new ApiResolver()],
  modules: [greetingModule]
});
```

### Create a module

```ts
import { createModule } from '@lafken/main';
import { GreetingApi } from './greeting.api';

const greetingModule = createModule({
  name: 'greeting',
  resources: [GreetingApi],
});
```

### Create a resource

```ts
@Api({
  path: 'awesome'
})
export class GreetingApi {
  @Get({
    path: '',
    lambda: {
      env: ({ getResourceValue }) => ({
        bar: 'simple-value',
        foo: process.env.FOO,
        apiId: getResourceValue('api::ExampleApi', 'id'),
        ssmValue: 'SSM::STRING::/path/to/awesome/ssm/value'
      }),
    }
  })
  sayHello() {
    return 'hello';
  }
}
```

### How It Works

Everything starts with the `main` library. This library provides all the required building blocks to bootstrap the application, allowing you to define global configuration and load the resolvers and modules that compose your application.

Modules are responsible for loading resources, which in turn rely on resolvers to be processed. Internally, each resolver defines how resource properties are interpreted and how the required infrastructure is provisioned. The most common responsibility of a resolver is the creation of AWS Lambda functions and their integration with downstream services. These Lambda functions may be configured with events, execution context, and callbacks, all of which are used at runtime.

Each Lambda also supports additional configuration options such as memory size, runtime, environment variables, and more. By default, environment variables can be defined at both the Lambda level and the application level through global configuration, either in the module or in the application itself.

Environment variables support both static and dynamic values, including values retrieved directly from AWS Systems Manager Parameter Store (SSM). This is achieved using the `SSM::STRING` or `SSM::SECURE_STRING` notation followed by the parameter path, for example:
`SSM::STRING::/path/from/ssm/variable`.

Each resolver enforces its own rules for infrastructure creation using CDK for Terraform (CDKTF). The framework allows you to create custom resolvers by implementing the ResolverType interface provided by the `@lafken/resolver` package. This package also includes helpers and reusable resources to simplify the implementation of Lambda functions, IAM roles, and environment variables.

Additionally, the `@lafken/common` package provides utility helpers for creating decorators, enabling the definition of resources in custom libraries in a consistent and declarative manner.

#### Overriding Resource Names

It is very common to reference resources by name in order to retrieve properties such as the resource ARN or ID, which can then be used as integrations or environment variables. To support this use case, the `@lafken/common` library exposes a set of types that can be overridden.

These types represent the resources available within your application and provide TypeScript autocomplete and type safety when referencing existing infrastructure resources.

Configuration

To enable this functionality, create or update the `lafken-types.d.ts` file and extend the `@lafken/common` module by declaring the resources available in your application.

Below is an example configuration:

```typescript
declare module '@lafken/common' {

  // Register application modules
  interface ModulesAvailable {
    // Module name
    greeting: {
      // STATE MACHINE resources within the module
      StateMachine: {
        // Resource name mapped to a boolean flag
        GreetingStepFunction: true;
      };
      // QUEUE resources within the module
      Queue: {
        'greeting-standard-queue': true;
      };
    };
  }

  // bucket
  interface BucketAvailable {
    'lafken-example-documents': true;
  }
  // api
  interface ApiRestAvailable {
    ExampleApi: boolean;
  }

  // api authorizers
  interface ApiAuthorizerAvailable {
    'api-key-auth': true;
    'cognito-auth': true;
  }

  // dynamo tables
  interface DynamoTableAvailable {
    clients: true;
  }

  // cognito user pools
  interface AuthAvailable {
    'example-user-pool': true;
  }
}

export {};
```

Supported Resource Types

The following interfaces can be extended to declare available resources:

```typescript
interface ModulesAvailable {}
interface AuthAvailable {}
interface BucketAvailable {}
interface ApiRestAvailable {}
interface ApiAuthorizerAvailable {}
interface EventBusAvailable {}
interface DynamoTableAvailable {}
```

Each interface corresponds to a specific type of infrastructure resource and can be extended as needed to reflect the resources defined in your application.

### Additional Documentation

Lafken includes several sub-packages with their own documentation:

* [Main module](packages/main/README.md)
* [Common module](packages/common/README.md)
* [Resolver module](packages/resolver/README.md)
* [API Module](packages/api/README.md)
* [Bucket Module](packages/bucket/README.md)
* [Dynamo Module](packages/dynamo/README.md)
* [Queue Module](packages/queue/README.md)
* [Event Module](packages/event/README.md)
* [Schedule Module](packages/schedule/README.md)
* [State Machine Module](packages/state-machine/README.md)
* [Auth Module](packages/auth/README.md)

## Configuration

Lafken can be configured depending on your project needs.
More details will be added as configuration options are defined.
