# @lafken/standalone

Define standalone AWS Lambda functions using TypeScript decorators. `@lafken/standalone` lets you declare independent Lambda handlers that can be invoked by other services, and automatically wires them up with optional IAM invoke roles and global references.

## Installation

```bash
npm install @lafken/standalone
```

## Getting Started

Define a standalone class with `@Standalone`, add `@Handler` methods, and register everything through `StandaloneResolver`:

```typescript
import { createApp, createModule } from '@lafken/main';
import { StandaloneResolver } from '@lafken/standalone/resolver';
import { Standalone, Handler } from '@lafken/standalone/main';

// 1. Define standalone handlers
@Standalone()
export class OrderFunctions {
  @Handler()
  processOrder() {
    console.log('Processing order...');
  }
}

// 2. Register in a module
const orderModule = createModule({
  name: 'order',
  resources: [OrderFunctions],
});

// 3. Add the resolver to the app
createApp({
  name: 'my-app',
  resolvers: [new StandaloneResolver()],
  modules: [orderModule],
});
```

Each `@Handler` method becomes an independent Lambda function ready to be invoked by other services.

## Features

### Standalone Class

Use the `@Standalone` decorator to group related Lambda handlers in a single class:

```typescript
import { Standalone, Handler } from '@lafken/standalone/main';

@Standalone()
export class NotificationFunctions {
  @Handler()
  sendEmail() { }

  @Handler()
  sendSms() { }
}
```

### Custom Handler Name

By default the method name is used as the Lambda handler identifier. Override it with the `name` option:

```typescript
@Handler({ name: 'process-payment' })
handlePayment() { }
```

### Invoke Role

Configure an IAM role that grants another principal permission to invoke the Lambda. When `invocator` is provided, a dedicated invoke role is created and attached to the function:

```typescript
@Handler({
  invocator: {
    principalRole: 'apigateway.amazonaws.com',
    services: [
      {
        type: 'execute-api',
        permissions: ['Invoke'],
        resources: ['*'],
      },
    ],
    roleRef: 'processOrderInvokeRole',
  },
})
processOrder() { }
```

#### Invocator Options

| Option               | Type             | Description                                                                 |
| -------------------- | ---------------- | --------------------------------------------------------------------------- |
| `principalRole`      | `string`         | AWS service or account ARN allowed to assume the role                       |
| `principalPermission`| `string`         | Permission level for the principal                                          |
| `services`           | `ServicesValues` | Additional IAM policy statements to include in the role                     |
| `roleRef`            | `string`         | Name to register the created role as a global reference                     |

### Global References

Use `ref` to register the Lambda function as a named global reference so other resources can access its attributes (e.g. ARN, function name):

```typescript
@Handler({
  ref: 'processOrderLambda',
})
processOrder() { }
```

### Lambda Configuration

Pass any Lambda-specific settings through the `lambda` option:

```typescript
@Handler({
  lambda: {
    timeout: 30,
    memorySize: 512,
    environment: {
      QUEUE_URL: 'https://sqs.us-east-1.amazonaws.com/...',
    },
  },
})
processOrder() { }
```

### Full Example

```typescript
import { createApp, createModule } from '@lafken/main';
import { StandaloneResolver } from '@lafken/standalone/resolver';
import { Standalone, Handler } from '@lafken/standalone/main';

@Standalone()
export class PaymentFunctions {
  @Handler({
    name: 'process-payment',
    ref: 'processPaymentLambda',
    invocator: {
      principalRole: 'apigateway.amazonaws.com',
      services: [
        {
          type: 'execute-api',
          permissions: ['Invoke'],
          resources: ['*'],
        },
      ],
      roleRef: 'processPaymentInvokeRole',
    },
    lambda: {
      timeout: 30,
      memorySize: 256,
    },
  })
  processPayment() { }

  @Handler({
    ref: 'refundPaymentLambda',
  })
  refundPayment() { }
}

const paymentModule = createModule({
  name: 'payment',
  resources: [PaymentFunctions],
});

createApp({
  name: 'my-app',
  resolvers: [new StandaloneResolver()],
  modules: [paymentModule],
});
```
