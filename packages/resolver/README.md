# @lafken/resolver

`@lafken/resolver` is the foundation package for building custom resolvers within the Lafken framework. It provides the `ResolverType` interface, infrastructure primitives (`LambdaHandler`, `Role`, `Environment`), and a global resource tracking system (`lafkenResource`) that enable developers to integrate any AWS service into Lafken.

If you want to create your own resolver — for example, to support a new AWS service or a custom integration — this package gives you everything you need.

## How Resolvers Work

Lafken follows a **Decorator → Resolver** architecture:

1. A **decorator** (built with `@lafken/common`) captures metadata about a class or method at build time.
2. A **resolver** reads that metadata and generates the corresponding CDKTN infrastructure.

Every resolver implements the `ResolverType` interface and is registered in `createApp()`. The framework invokes resolver lifecycle hooks in order:

```
beforeCreate(scope)  →  create(module, resource)  →  afterCreate(scope)
```

- **`beforeCreate`** — Called once per resolver before any resource is processed. Use it to create shared infrastructure (e.g., an API Gateway, an EventBridge bus).
- **`create`** — Called once per decorated resource. This is where you read metadata and generate the resource's infrastructure.
- **`afterCreate`** — Called once after all resources are processed. Use it to finalize configurations (e.g., wire integrations, build Lambda assets).

## Getting Started

This example walks through creating a complete custom resolver for AWS SNS topics.

### 1. Define the Decorator

Use `createResourceDecorator` and `createLambdaDecorator` from `@lafken/common` to capture metadata:

```typescript
// src/main/sns.ts
import { createResourceDecorator, createLambdaDecorator } from '@lafken/common';

export const RESOURCE_TYPE = 'SNS' as const;

export interface TopicProps {
  name?: string;
}

export interface PublishProps {
  name: string;
}

export interface PublishMetadata extends PublishProps {
  name: string;
}

// Class decorator — marks a class as an SNS resource
export const Topic = createResourceDecorator<TopicProps>({
  type: RESOURCE_TYPE,
  callerFileIndex: 5,
});

// Method decorator — marks a method as a handler
export const Publish = (props: PublishProps) =>
  createLambdaDecorator<PublishProps, PublishMetadata>({
    getLambdaMetadata: (props, methodName) => ({
      ...props,
      name: methodName,
    }),
  })(props);
```

### 2. Implement the Resolver

```typescript
// src/resolver/resolver.ts
import {
  type ClassResource,
  getResourceMetadata,
  getResourceHandlerMetadata,
  type ResourceMetadata,
} from '@lafken/common';
import {
  type AppModule,
  type AppStack,
  type ResolverType,
  LambdaHandler,
  lambdaAssets,
} from '@lafken/resolver';
import { SnsTopic } from '@cdktn/provider-aws/lib/sns-topic';
import { SnsTopicSubscription } from '@cdktn/provider-aws/lib/sns-topic-subscription';
import { RESOURCE_TYPE, type PublishMetadata } from '../main/sns';

export class SnsResolver implements ResolverType {
  public type = RESOURCE_TYPE;

  public create(module: AppModule, resource: ClassResource) {
    const metadata: ResourceMetadata = getResourceMetadata(resource);
    const handlers = getResourceHandlerMetadata<PublishMetadata>(resource);

    // Initialize Lambda build assets
    lambdaAssets.initializeMetadata({
      foldername: metadata.foldername,
      filename: metadata.filename,
      minify: metadata.minify,
      className: metadata.originalName,
      methods: handlers.map((h) => h.name),
    });

    // Create SNS Topic
    const topic = new SnsTopic(module, `${metadata.name}-topic`, {
      name: metadata.name,
    });

    // Create a Lambda + subscription for each handler
    for (const handler of handlers) {
      const id = `${handler.name}-${metadata.name}`;

      const lambda = new LambdaHandler(module, id, {
        ...handler,
        filename: metadata.filename,
        foldername: metadata.foldername,
        originalName: metadata.originalName,
        principal: 'sns.amazonaws.com',
      });

      new SnsTopicSubscription(module, `${id}-subscription`, {
        topicArn: topic.arn,
        protocol: 'lambda',
        endpoint: lambda.arn,
      });
    }
  }
}
```

### 3. Register in Your App

```typescript
import { createApp, createModule } from '@lafken/main';
import { SnsResolver } from './resolver/resolver';
import { NotificationService } from './modules/notifications';

const notifications = createModule({
  name: 'notifications',
  resources: [NotificationService],
});

createApp({
  name: 'my-app',
  modules: [notifications],
  resolvers: [new SnsResolver()],
});
```

### 4. Use the Decorators

```typescript
// src/modules/notifications.ts
import { Topic, Publish } from '../main/sns';

@Topic({ name: 'order-events' })
export class NotificationService {
  @Publish({ name: 'order-created' })
  onOrderCreated() {
    // handler logic
  }

  @Publish({ name: 'order-shipped' })
  onOrderShipped() {
    // handler logic
  }
}
```

## ResolverType Interface

The contract every resolver must implement:

```typescript
interface ResolverType {
  type: string;
  beforeCreate?: (scope: AppStack) => Promise<void> | void;
  create: (module: AppModule, resource: ClassResource) => Promise<void> | void;
  afterCreate?: (scope: AppStack) => Promise<void> | void;
}
```

| Property | Type | Required | Description |
|---|---|---|---|
| `type` | `string` | Yes | Unique identifier that matches the `type` set by the resource decorator. |
| `beforeCreate` | `(scope: AppStack) => void` | No | Called once before any resource is processed. Receives the root stack. |
| `create` | `(module: AppModule, resource: ClassResource) => void` | Yes | Called for each decorated resource whose `type` matches this resolver. |
| `afterCreate` | `(scope: AppStack) => void` | No | Called once after all resources have been processed. Receives the root stack. |

### Lifecycle Parameters

- **`AppStack`** — The root `TerraformStack` with an `id` property. Available in `beforeCreate` and `afterCreate`.
- **`AppModule`** — A scoped `Construct` representing the module that contains the resource. Available in `create`.
- **`ClassResource`** — The decorated class itself. Use `getResourceMetadata()` and `getResourceHandlerMetadata()` from `@lafken/common` to extract metadata.

## LambdaHandler

`LambdaHandler` creates AWS Lambda functions with automatic IAM roles, environment variable management, and context-aware configuration. It extends `LambdaFunction` from CDKTN via `lafkenResource.make()`, so it supports global tracking and dependency resolution.

```typescript
import { LambdaHandler } from '@lafken/resolver';

new LambdaHandler(module, 'process-order', {
  name: 'processOrder',
  filename: 'order-handler',
  foldername: 'src/handlers',
  originalName: 'OrderService',
  principal: 'apigateway.amazonaws.com', // optional invoke permission
  lambda: {
    memory: 256,
    timeout: 30,
    runtime: 22,
    enableTrace: true,
    services: ['dynamodb', 's3'],
    env: { TABLE_NAME: 'orders' },
  },
});
```

### Configuration Resolution

`LambdaHandler` resolves configuration values using a hierarchical precedence:

```
handler-level  >  module-level  >  app-level  >  default
```

This applies to `runtime`, `timeout`, `memory`, and `env`. Values set directly on the handler override module-level config, which in turn overrides app-level globals.

### LambdaHandlerProps

| Property | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Method name used as the Lambda handler entry point. |
| `filename` | `string` | Yes | Source file name (without extension) for bundling. |
| `foldername` | `string` | Yes | Source directory path for bundling. |
| `originalName` | `string` | Yes | Original class name, used for asset generation. |
| `suffix` | `string` | No | Appended to the function name for uniqueness. |
| `principal` | `string` | No | AWS service principal for invoke permission (e.g., `apigateway.amazonaws.com`). |
| `lambda` | `LambdaProps` | No | Lambda-specific configuration (memory, timeout, runtime, services, env, etc.). |

## Role

`Role` creates IAM roles with predefined permission sets for common AWS services. It extends `IamRole` via `lafkenResource.make()`.

```typescript
import { Role } from '@lafken/resolver';

// Simple: grant default permissions for listed services
new Role(scope, 'service-role', {
  name: 'order-processor-role',
  services: ['dynamodb', 's3', 'sqs'],
});

// Fine-grained: specify permissions and resources
new Role(scope, 'restricted-role', {
  name: 'read-only-role',
  services: [
    { type: 'dynamodb', permissions: ['Query', 'GetItem'], resources: ['arn:aws:dynamodb:*:*:table/orders'] },
    { type: 's3', permissions: ['GetObject'], resources: ['arn:aws:s3:::my-bucket/*'] },
  ],
});
```

### Supported Services

Each service name maps to a default set of IAM actions:

| Service | IAM Prefix | Default Actions |
|---|---|---|
| `dynamodb` | `dynamodb:` | Query, Scan, GetItem, BatchGetItem, PutItem, DeleteItem, UpdateItem, ConditionCheckItem |
| `s3` | `s3:` | Full CRUD — GetObject, PutObject, DeleteObject, ListBucket, and more |
| `lambda` | `lambda:` | InvokeFunction |
| `cloudwatch` | `logs:` | CreateLogGroup, CreateLogStream, PutLogEvents, and more |
| `sqs` | `sqs:` | SendMessage, ReceiveMessage, DeleteMessage, GetQueueUrl, GetQueueAttributes |
| `state_machine` | `states:` | StartExecution, StopExecution, DescribeExecution, GetExecutionHistory |
| `kms` | `kms:` | Encrypt, Decrypt, GenerateDataKey, DescribeKey, and more |
| `ssm` | `ssm:` | GetParameter, GetParameters, PutParameter, DescribeParameters, and more |
| `event` | `events:` | PutEvents, PutRule, DescribeRule, DescribeEventBus |

### RoleProps

| Property | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | IAM role name. |
| `services` | `Services[]` | Yes | Service permissions — an array of service names or fine-grained permission objects. |
| `principal` | `string` | No | AWS service principal for `AssumeRole`. Defaults to `lambda.amazonaws.com`. |

### Custom Service Permissions

For services not in the predefined list, use the `custom` type:

```typescript
new Role(scope, 'custom-role', {
  name: 'ses-sender-role',
  services: [
    { type: 'custom', serviceName: 'ses', permissions: ['SendEmail', 'SendRawEmail'], resources: ['*'] },
  ],
});
```

## lafkenResource

`lafkenResource` is the global resource registry. It provides two core capabilities:

1. **Mixin creation** — `lafkenResource.make(BaseClass)` enhances any CDKTN `Construct` with `register()` and `onResolve()` methods.
2. **Global tracking** — Resources registered with `register()` can be retrieved from anywhere using `getResource()`.

### make(BaseClass)

Creates a subclass that adds resource tracking methods. `BaseClass` must extend CDKTN's `Construct` — this works for any Terraform resource construct, not just the ones Lafken already ships a resolver for:

```typescript
import { lafkenResource } from '@lafken/resolver';
import { SnsTopic } from '@cdktn/provider-aws/lib/sns-topic';

// Create a trackable version of SnsTopic
class TrackableTopic extends lafkenResource.make(SnsTopic) {}

const topic = new TrackableTopic(scope, 'my-topic', { name: 'events' });

// Register globally so other resolvers can reference it
topic.register('notifications', 'events-topic');
```

### register(namespace, id)

Registers a resource instance under a `namespace::id` key so other resources can look it up:

```typescript
topic.register('notifications', 'events-topic');
// Retrievable as 'notifications::events-topic'
```

`namespace` accepts any of the built-in `RegisterNamespaces` values (`'api'`, `'bucket'`, `'dynamo'`, `'queue'`, `'lambda'`, ...) or an arbitrary string, so custom/unsupported resources can pick their own namespace.

### onResolve(callback)

Defers configuration that depends on resources not yet created. The callback is invoked during `lafkenResource.resolve()`, which the framework calls automatically after every resolver's `afterCreate` phase has run:

```typescript
lambda.onResolve(() => {
  const topic = lafkenResource.getResource('notifications', 'events-topic');
  lambda.addOverride('environment.variables.TOPIC_ARN', topic.arn);
});
```

### getResource(module, id)

Retrieves a globally registered resource:

```typescript
const topic = lafkenResource.getResource<SnsTopic>('notifications', 'events-topic');
console.log(topic.arn);
```

### resolve()

Runs every callback queued via `onResolve()`. Called automatically by `createApp()` after all resolvers have completed their `afterCreate` phase — you don't need to call it yourself.

### Wrapping an arbitrary Terraform resource

Because `make()` accepts any CDKTN construct, it's the escape hatch for using a Terraform resource Lafken has no dedicated decorator/resolver for. Wrap it, `register()` it under a namespace of your choice, then read it from anywhere — including a Lambda's `env` — with `Refs.resourceValue('namespace::id', attribute)` (see [Environment Variables](#environment-variables)):

```typescript
// resolver.ts — any resolver's create()/beforeCreate()
import { lafkenResource } from '@lafken/resolver';
import { CloudfrontDistribution } from '@cdktn/provider-aws/lib/cloudfront-distribution';

class TrackableDistribution extends lafkenResource.make(CloudfrontDistribution) {}

const distribution = new TrackableDistribution(module, 'cdn', {
  /* ...distribution config... */
});

distribution.register('cdn', 'assets-distribution');
```

```typescript
// elsewhere — a LambdaHandler's env, in the same or a different resolver
import { Refs } from '@lafken/common';

lambda: {
  env: {
    DISTRIBUTION_ID: Refs.resourceValue('cdn::assets-distribution', 'id'),
    DISTRIBUTION_DOMAIN: Refs.resourceValue('cdn::assets-distribution', 'domainName'),
  },
}
```

`Refs.resourceValue` returns a `Lazy` CDKTN token that looks the resource up in the registry at synth time, so declaration order between the wrapped resource and the Lambda that references it doesn't matter — as long as both exist by the time `createApp()` synthesizes the stack.

## lambdaAssets

`lambdaAssets` manages the build and bundling pipeline for Lambda functions using Rolldown. It handles code splitting, minification, and asset packaging.

### initializeMetadata(props)

Registers metadata for a Lambda source file. Must be called in the resolver's `create` method before any `LambdaHandler` instances reference it:

```typescript
lambdaAssets.initializeMetadata({
  foldername: metadata.foldername,
  filename: metadata.filename,
  minify: metadata.minify,
  className: metadata.originalName,
  methods: handlers.map((h) => h.name),
});
```

### createAssets()

Builds all registered Lambda assets. Called automatically by the framework after all resolvers complete. Each asset is bundled with Rolldown as a CJS module targeting Node.js, with `@aws-sdk` and `aws-lambda` as externals.

| Property | Type | Description |
|---|---|---|
| `foldername` | `string` | Source directory containing the handler file. |
| `filename` | `string` | Source file name (without extension). |
| `minify` | `boolean` | Whether to minify the output. Defaults to `true`. |
| `className` | `string` | Original class name for the build plugin. |
| `methods` | `string[]` | Method names to export from the bundle. |
| `afterBuild` | `(outputPath: string) => void` | Optional post-build hook. |

## Environment Variables

Lambda environment variables (`EnvironmentValue = Record<string, string>`) are passed straight through to the underlying `aws_lambda_function` resource — there is no dedicated `Environment` construct or SSM-string convention to parse. Static values are plain strings; dynamic values are produced by calling `Refs.resourceValue`/`Refs.ssmValue` (from `@lafken/common`) directly, since both already return a real, deferred CDKTN token by the time they land in the config:

```typescript
import { Refs } from '@lafken/common';

lambda: {
  env: {
    TABLE_NAME: 'orders',
    TABLE_ARN: Refs.resourceValue('database::orders-table', 'arn'),
    API_KEY: Refs.ssmValue('/config/api-key'),
    DB_PASSWORD: Refs.ssmValue('/config/db-password', true), // secure string
  },
}
```

These functions are resolved lazily by CDKTN at synth time, regardless of the declaration order between the resources involved — see [`@lafken/common`'s Cross-Resource Refss](../common/README.md#cross-resource-references) for the full list of available reference functions (`Refs.resourceValue`, `Refs.ssmValue`, `Refs.accountId`, `Refs.callerArn`, `Refs.region`, `Refs.partition`, `Refs.dnsSuffix`, `fn`, `token`) and how `registerRefResolvers` wires this resolver package's implementation into them.

## Testing Utilities

### setupTestingStack()

Creates a test-ready CDKTN stack for unit testing resolvers:

```typescript
import { setupTestingStack } from '@lafken/resolver';

const { app, stack } = setupTestingStack();
```

### setupTestingStackWithModule()

Creates a stack with a pre-configured module scope:

```typescript
import { setupTestingStackWithModule } from '@lafken/resolver';

const { app, stack, module } = setupTestingStackWithModule();
```

### enableBuildEnvVariable()

Decorators only capture metadata during builds. In tests, enable build mode first:

```typescript
import { enableBuildEnvVariable } from '@lafken/common';

describe('SnsResolver', () => {
  enableBuildEnvVariable();

  // Now decorators will work
  @Topic({ name: 'test-topic' })
  class TestResource {
    @Publish({ name: 'test' })
    handler() {}
  }
});
```

## Building a Custom Resolver — Summary

1. **Create decorators** with `createResourceDecorator()` / `createLambdaDecorator()` from `@lafken/common`. Set a unique `type` string.
2. **Implement `ResolverType`** — set `type` to match your decorator, implement `create()` to process resources, optionally use `beforeCreate()` / `afterCreate()` for shared or deferred setup.
3. **Use `LambdaHandler`** to create Lambda functions with automatic IAM, context, and environment management.
4. **Use `lambdaAssets`** to register and build Lambda source code.
5. **Use `lafkenResource.make()`** to extend any CDKTN construct with global tracking and dependency resolution.
6. **Register your resolver** in `createApp({ resolvers: [new YourResolver()] })`.
