# @lafken/main

Core entry point for a Lafken serverless application. `@lafken/main` initializes the AWS provider, orchestrates resolvers and modules, and synthesizes the resulting Terraform configuration through CDKTN. It provides `createApp` to bootstrap the application and `createModule` to organize resources into logical groups.

## Installation

```bash
npm install @lafken/main
```

## Getting Started

Create an application with resolvers and modules, then let Lafken generate all the infrastructure:

```typescript
import { createApp, createModule } from '@lafken/main';
import { ApiResolver } from '@lafken/api/resolver';
import { QueueResolver } from '@lafken/queue/resolver';

// 1. Define modules that group related resources
const userModule = createModule({
  name: 'users',
  resources: [UserApi, UserQueue],
});

const billingModule = createModule({
  name: 'billing',
  resources: [InvoiceSchedule],
});

// 2. Create the application
await createApp({
  name: 'my-app',
  modules: [userModule, billingModule],
  resolvers: [
    new ApiResolver({ restApi: { name: 'my-api' } }),
    new QueueResolver(),
  ],
});
```

## Features

### createApp

`createApp` is the main entry point. It initializes the AWS stack, runs all resolver lifecycle hooks (`beforeCreate` → `create` → `afterCreate`), and synthesizes the Terraform output:

```typescript
await createApp({
  name: 'my-app',
  modules: [userModule, billingModule],
  resolvers: [new ApiResolver(), new QueueResolver()],
  globalConfig: {
    lambda: {
      memory: 512,
      timeout: 30,
      runtime: 22,
      services: ['dynamodb', 's3', 'sqs'],
    },
    tags: {
      environment: 'production',
      team: 'platform',
    },
  },
  awsProviderConfig: {
    region: 'us-east-1',
    profile: 'my-aws-profile',
  },
  state: {
    type: 's3',
    bucket: 'my-terraform-state',
    key: 'app/terraform.tfstate',
    region: 'us-east-1',
  },
  extend: async (scope) => {
    // Add custom CDKTN constructs after all resolvers finish
  },
});
```

#### Application Options

| Option              | Type                | Required | Description                                               |
| ------------------- | ------------------- | -------- | --------------------------------------------------------- |
| `name`              | `string`            | Yes      | Application name, used as the stack identifier             |
| `modules`           | `ReturnType<typeof createModule>[]` | Yes | Modules created with `createModule()` — each entry is the async factory function it returns, not a `StackModule` instance directly |
| `resolvers`         | `ResolverType[]`    | Yes      | Resolvers that process decorated resources                 |
| `globalConfig`      | `GlobalConfig`      | No       | Shared Lambda, tag, and bundler settings for all resources  |
| `awsProviderConfig` | `AwsProviderConfig` | No       | AWS provider settings (region, profile, etc.)              |
| `state`             | `StateConfig`       | No       | Terraform state backend (`s3` or `local`)                  |
| `extend`            | `(scope) => void`   | No       | Callback invoked after all resolvers finish                |

#### Return Value

`createApp` resolves once the whole app has been built and synthesized to Terraform:

```typescript
const { app, appStack } = await createApp({ /* ... */ });
```

| Property   | Type       | Description                                                          |
| ---------- | ---------- | ---------------------------------------------------------------------- |
| `app`      | `App`      | The root CDKTN `App` instance.                                         |
| `appStack` | `AppStack` | The `TerraformStack` created for this application — the same instance passed to the `extend` callback. |

### createModule

`createModule` groups related resources into a logical unit with its own scope, IAM role, and configuration. Each resource inside the module is processed by the matching resolver based on its decorator type:

```typescript
const orderModule = createModule({
  name: 'orders',
  resources: [OrderApi, OrderQueue, OrderSchedule],
  globalConfig: {
    lambda: {
      memory: 256,
      timeout: 15,
      services: ['dynamodb', 'sqs'],
    },
    tags: {
      domain: 'orders',
    },
  },
});
```

#### Module Options

| Option         | Type              | Required | Description                                           |
| -------------- | ----------------- | -------- | ----------------------------------------------------- |
| `name`         | `string`          | Yes      | Module name, used as scope and tag identifier          |
| `resources`    | `ClassResource[]` | Yes      | Decorated classes to be processed by resolvers         |
| `globalConfig` | `GlobalConfig`    | No       | Lambda and tag settings scoped to this module          |

### Global Configuration

Global configuration applies default settings to all Lambda functions and resources, at two levels — app-wide (`createApp`'s `globalConfig`) and module-wide (`createModule`'s `globalConfig`). It's not a single cascading mechanism, though: two different rules apply depending on the option.

Most `lambda` options (`memory`, `timeout`, `runtime`, `architecture`, `ephemeralStorage`, `reservedConcurrency`, `alias`, `loggingConfig`, `layers`, `outputs`, `ref`) and `bundler` are resolved per key by `@lafken/resolver`'s `LambdaHandler` when it builds each function, with the handler's own value winning over the module's, which wins over the app's, which wins over the framework default:

```
handler-level  >  module-level  >  app-level  >  default
```

`lambda.env` and `lambda.vpcConfig` are different: they're not read by `LambdaHandler` at all. Instead, `createApp`/`createModule` attach a CDKTN `Aspect` (`AppAspect`) that runs once, after every resolver has finished, and walks every `LambdaFunction` construct in the whole stack — merging the app's and module's `env` into each function's environment variables, and setting `vpcConfig` on any function that doesn't already have one from its own handler-level config. So a handler-level `env`/`vpcConfig` is never overwritten, but the merge happens as a separate post-processing pass rather than as part of `LambdaHandler`'s own config resolution.

`tags` and `services` follow their own rules — see [Tags](#tags) and [Available Services](#available-services) below.

#### Lambda Configuration

Available under `globalConfig.lambda` at both the app and module level (everything except `tags` and `functionName`, which only make sense per-resource):

| Option        | Type             | Description                                               |
| ------------- | ---------------- | --------------------------------------------------------- |
| `memory`      | `number`         | Memory allocation in MB                                   |
| `timeout`     | `number`         | Execution timeout in seconds                              |
| `runtime`     | `22 \| 24` | Node.js runtime version                                   |
| `services`    | `Services[]`     | AWS services the Lambda can access (creates IAM role)     |
| `enableTrace` | `boolean`        | Enable AWS X-Ray tracing                                  |
| `env`         | `EnvironmentValue` | Environment variables for Lambda functions — merged in by `AppAspect`, see above |
| `vpcConfig`   | `VpcConfig`      | VPC placement (`securityGroupIds`, `subnetIds`) — applied by `AppAspect`, see above |
| `ephemeralStorage` | `number`    | `/tmp` size in MB (512–10240)                              |
| `reservedConcurrency` | `number` | Caps concurrent executions (`0` throttles the function)   |
| `architecture` | `'x86_64' \| 'arm64'` | Instruction set architecture                       |
| `alias`       | `AliasConfig`    | Publishes a version and creates an alias, optionally with provisioned concurrency |
| `loggingConfig` | `LoggingConfig` | CloudWatch log format, retention, and application/system log levels |
| `layers`      | `string[]`       | Layer ARNs — merged across app, module, and handler levels, not overridden |
| `outputs`     | `ResourceOutputType<LambdaOutputAttributes>` | Exports `arn`/`invokeArn`/`qualifiedArn` to SSM or as a Terraform output |
| `ref`         | `string`         | Registers the function as a named global reference         |

#### Bundler Configuration

`globalConfig.bundler` controls how Lambda source files are bundled by rolldown, at the app and module level:

```typescript
globalConfig: {
  bundler: { minify: true, externalPackages: ['my-shared-lib'] },
}
```

| Option             | Type                    | Description                                               |
| ------------------ | ----------------------- | ----------------------------------------------------------- |
| `minify`           | `boolean`               | Enables minification — resource-level `bundler.minify` takes precedence when set |
| `externalPackages` | `(string \| RegExp)[]` | Extra packages to exclude from the bundle — accumulates across app, module, and resource levels, on top of the always-external `@aws-sdk/*`, `aws-lambda`, `node:*` |

#### Available Services

Services define which AWS resources the Lambda IAM role can access:

| Service         | Description                      |
| --------------- | -------------------------------- |
| `dynamodb`      | Amazon DynamoDB                  |
| `s3`            | Amazon S3                        |
| `lambda`        | AWS Lambda                       |
| `cloudwatch`    | Amazon CloudWatch Logs           |
| `sqs`           | Amazon SQS                       |
| `state_machine` | AWS Step Functions               |
| `kms`           | AWS KMS                          |
| `ssm`           | AWS Systems Manager Parameter Store |
| `event`         | Amazon EventBridge               |
| `kinesis`       | Amazon Kinesis                   |

For fine-grained control, specify individual permissions:

```typescript
services: [
  'cloudwatch',
  { type: 'dynamodb', permissions: ['Query', 'GetItem'] },
  { type: 's3', permissions: ['GetObject'], resources: ['arn:aws:s3:::my-bucket/*'] },
  { type: 'custom', serviceName: 'ses', permissions: ['SendEmail'] },
]
```

#### Tags

Tags are applied automatically to all taggable resources. Module-level tags merge with app-level tags, and resource-specific tags take highest precedence:

```typescript
// App-level tags
globalConfig: {
  tags: {
    environment: 'production',
    project: 'my-app',
  },
}

// Module-level tags (merged with app tags)
globalConfig: {
  tags: {
    domain: 'orders',
  },
}
```

Lafken also adds automatic tags: `lafken:app` with the app name and `lafken:module` with the module name.

### State Backend

The `state` option selects where the Terraform state file is stored. It is a discriminated union on `type`, so each backend only accepts its own options. When omitted, no backend block is generated and Terraform keeps its default behaviour.

Use `s3` to store the state remotely for team collaboration and state locking:

```typescript
await createApp({
  name: 'my-app',
  state: {
    type: 's3',
    bucket: 'terraform-state-bucket',
    key: 'apps/my-app/terraform.tfstate',
    region: 'us-east-1',
    dynamodbTable: 'terraform-locks',
  },
});
```

Use `local` to store the state on the local filesystem, which is convenient for local development and single-developer workflows:

```typescript
await createApp({
  name: 'my-app',
  state: {
    type: 'local',
    path: './terraform.tfstate',
  },
});
```

### Extending the Application

The `extend` callback runs after all resolvers have finished processing. Use it to add custom infrastructure that is not covered by the standard resolvers:

```typescript
await createApp({
  name: 'my-app',
  modules: [userModule],
  resolvers: [new ApiResolver()],
  extend: async (scope) => {
    // Add any CDKTN construct directly to the stack
  },
});
```
