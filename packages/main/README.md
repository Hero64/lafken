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
  s3Backend: {
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
| `modules`           | `StackModule[]`     | Yes      | Modules created with `createModule`                        |
| `resolvers`         | `ResolverType[]`    | Yes      | Resolvers that process decorated resources                 |
| `globalConfig`      | `GlobalConfig`      | No       | Shared Lambda and tag settings for all resources           |
| `awsProviderConfig` | `AwsProviderConfig` | No       | AWS provider settings (region, profile, etc.)              |
| `s3Backend`         | `S3BackendConfig`   | No       | Remote S3 backend for Terraform state                      |
| `extend`            | `(scope) => void`   | No       | Callback invoked after all resolvers finish                |

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

Global configuration applies default settings to all Lambda functions and resources. Values cascade from application to module to individual resource, with more specific settings taking precedence:

```
App globalConfig → Module globalConfig → Resource-level config
```

#### Lambda Configuration

| Option        | Type             | Description                                               |
| ------------- | ---------------- | --------------------------------------------------------- |
| `memory`      | `number`         | Memory allocation in MB                                   |
| `timeout`     | `number`         | Execution timeout in seconds                              |
| `runtime`     | `20 \| 22 \| 24` | Node.js runtime version                                   |
| `services`    | `Services[]`     | AWS services the Lambda can access (creates IAM role)     |
| `enableTrace` | `boolean`        | Enable AWS X-Ray tracing                                  |
| `env`         | `EnvironmentValue` | Environment variables for Lambda functions              |

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

### S3 Backend

Store Terraform state remotely in an S3 bucket for team collaboration and state locking:

```typescript
await createApp({
  name: 'my-app',
  s3Backend: {
    bucket: 'terraform-state-bucket',
    key: 'apps/my-app/terraform.tfstate',
    region: 'us-east-1',
    dynamodbTable: 'terraform-locks',
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
