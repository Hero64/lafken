# Lafken

**A TypeScript framework for building serverless applications on AWS using decorators.**

Lafken simplifies AWS infrastructure by letting you define resources with decorators in your TypeScript code. Focus on your application logic while Lafken automatically generates and manages all the infrastructure using Terraform.

> ℹ️ **Note on CDKTF Deprecation**  
> Lafken currently uses CDKTF, which HashiCorp has deprecated. The community project [cdk-terrain](https://github.com/open-constructs/cdk-terrain) is actively maintaining this ecosystem. We're planning to migrate Lafken to this new foundation for long-term stability.

## ✨ Key Features

- **Decorator-Based**: Define infrastructure with familiar TypeScript decorators
- **Type-Safe**: Full TypeScript support with autocomplete for resources
- **Zero Configuration**: Start building immediately with sensible defaults
- **Modular**: Organize resources into logical modules
- **Extensible**: Create custom resolvers for additional AWS services
- **Infrastructure as Code**: Infrastructure is version-controlled TypeScript code

## 🚀 Getting Started

### Installation

Create a new Lafken project:

```bash
npm create lafken@latest
```

Or install in an existing TypeScript project:

```bash
npm install @lafken/main @lafken/api @lafken/resolver
```

### System Requirements

- Node.js >= 20.19
- pnpm >= 10.20.0
- TypeScript >= 5.0

## 📚 Core Concepts

Lafken works through three key components:

1. **Decorators**: Mark your classes and methods to define infrastructure (`@Api`, `@Get`, `@Queue`, etc.)
2. **Modules**: Group related resources together with shared configuration
3. **App**: Register modules and resolvers to generate your infrastructure

Here's the flow:

```
TypeScript Code (with decorators)
    ↓
Module (groups resources)
    ↓
App + Resolvers (processes decorators)
    ↓
Terraform Configuration (generated automatically)
```

## 💡 5-Minute Example

Here's a complete serverless API:

### 1. Define Your Resource

```ts
import { Api, Get, Payload, Param  } from '@lafken/api/main';

@Payload()
export class HelloEvent {
  @Param({
    source: 'path',
  })
  name: number;
}


@Api({
  path: '/hello'
})
export class HelloApi {
  @Get({
    path: '/{name}'
  })
  greet(@Event(HelloEvent) event: HelloEvent) {
    return {
      message: `Hello, ${event.name}!`
    };
  }
}
```

### 2. Create a Module

```ts
import { createModule } from '@lafken/main';

export const apiModule = createModule({
  name: 'api',
  resources: [HelloApi],
});
```

### 3. Create Your App

```ts
import { createApp } from '@lafken/main';
import { ApiResolver } from '@lafken/api/resolver';

createApp({
  name: 'hello-app',
  resolvers: [new ApiResolver()],
  modules: [apiModule],
});
```

That's it! Lafken generates all the AWS infrastructure:
- API Gateway REST API
- Lambda function
- IAM roles with least-privilege permissions
- Terraform configuration

## 🔧 Advanced Features

### Environment Variables

Define environment variables for your Lambda functions with support for static and dynamic values:

```ts
@Api({ path: '/users' })
export class UserApi {
  @Get({
    path: '/{id}',
    lambda: {
      env: ({ getResourceValue }) => ({
        // Static value
        APP_NAME: 'my-app',
        
        // Environment variable
        DEBUG: process.env.DEBUG || 'false',
        
        // Dynamic reference to another resource
        TABLE_NAME: getResourceValue('dynamo::users', 'name'),
        
        // AWS Systems Manager Parameter Store
        API_KEY: 'SSM::STRING::/my-app/api-key'
      }),
    }
  })
  getUser() { /* ... */ }
}
```

### Type-Safe Resource References

Enable TypeScript autocomplete for your infrastructure:

Create `lafken-types.d.ts` in your project root:

```ts
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
    UserApi: true;
  }

  interface DynamoTableAvailable {
    users: true;
  }
}

export {};
```

Now you get full autocomplete:

```ts
getResourceValue('dynamo::users', 'arn')  // ✓ TypeScript knows this is valid
getResourceValue('dynamo::invalid', 'arn') // ✗ TypeScript error
```

### Creating Custom Resolvers

Extend Lafken with your own AWS services:

```ts
import { ResolverType } from '@lafken/resolver';

export class MyServiceResolver implements ResolverType {
  async beforeCreate(scope) { /* Shared resources */ }
  async create(module, resource) { /* Process resource */ }
  async afterCreate(scope) { /* Configure integrations */ }
}
```

## 📖 Complete Package Documentation

Lafken is organized into focused packages. Here's what each does:

| Package | Purpose |
|---------|---------|
| **@lafken/main** | Core engine - create apps and modules |
| **@lafken/api** | REST APIs with API Gateway |
| **@lafken/queue** | SQS queues and message processing |
| **@lafken/event** | EventBridge event buses |
| **@lafken/schedule** | Scheduled Lambda functions |
| **@lafken/state-machine** | Step Functions workflows |
| **@lafken/bucket** | S3 bucket management |
| **@lafken/dynamo** | DynamoDB tables |
| **@lafken/auth** | Cognito authentication |
| **@lafken/resolver** | Base utilities for creating resolvers |
| **@lafken/common** | Decorators and type utilities |

**View full documentation for each package:**

- [Main Module](packages/main/README.md) - Application setup and configuration
- [API Module](packages/api/README.md) - Create REST APIs
- [Queue Module](packages/queue/README.md) - SQS queues and workers
- [Event Module](packages/event/README.md) - EventBridge event buses
- [Schedule Module](packages/schedule/README.md) - Scheduled tasks
- [State Machine Module](packages/state-machine/README.md) - Step Functions
- [Bucket Module](packages/bucket/README.md) - S3 buckets
- [Dynamo Module](packages/dynamo/README.md) - DynamoDB tables
- [Auth Module](packages/auth/README.md) - Cognito setup
- [Resolver Module](packages/resolver/README.md) - Create custom resolvers
- [Common Module](packages/common/README.md) - Utilities and decorators

## 🤝 Contributing

We welcome contributions! Here are some ways to help:

- **Report Bugs**: Use the [bug report template](https://github.com/Hero64/lafken/issues/new?template=bug_report.md)
- **Suggest Features**: Use the [feature request template](https://github.com/Hero64/lafken/issues/new?template=feature_request.md)
- **Improve Docs**: Open a [documentation issue](https://github.com/Hero64/lafken/issues/new?template=documentation.md)
- **Submit Code**: Read our [Contributing Guide](CONTRIBUTING.md)

## 🛡️ Security

Found a security vulnerability? Please report it responsibly via [SECURITY.md](SECURITY.md). Do not open public issues for security vulnerabilities.

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

## ❓ Need Help?

- **GitHub Discussions**: [Ask questions and share ideas](https://github.com/Hero64/lafken/discussions)
- **GitHub Issues**: [Report bugs or request features](https://github.com/Hero64/lafken/issues)
- **Code of Conduct**: Please review our [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

---

**Happy building with Lafken! 🚀**
