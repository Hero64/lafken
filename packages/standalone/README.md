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

### Invoke

Configure how other principals are allowed to invoke the Lambda through the `invoke` option. It supports two complementary mechanisms:

- `permission` — grants a service principal direct invoke permission via a resource-based policy (`aws lambda add-permission`). This is the usual mechanism for push-based invokers such as API Gateway, EventBridge or SNS.
- `role` — creates a dedicated IAM role another principal can assume to obtain `lambda:InvokeFunction` on this function (caller-side, identity-based access such as API Gateway integration credentials or cross-account calls).

```typescript
@Handler({
  invoke: {
    permission: {
      principal: 'apigateway.amazonaws.com',
      sourceArn: (props) => props.getResourceValue('api::orders', 'arn'),
    },
    role: {
      principal: 'apigateway.amazonaws.com',
      services: [
        {
          type: 'lambda',
          permissions: ['InvokeFunction'],
          resources: ['*'],
        },
      ],
      ref: 'processOrderInvokeRole',
    },
  },
})
processOrder() { }
```

#### `invoke.permission` Options

| Option          | Type                                          | Description                                                                 |
| --------------- | --------------------------------------------- | --------------------------------------------------------------------------- |
| `principal`     | `string`                                      | Service principal allowed to invoke the function (e.g. `apigateway.amazonaws.com`) |
| `sourceArn`     | `string \| ((props) => string)`               | Restricts invocation to a specific source ARN. A callback can reference another resource's ARN |
| `sourceAccount` | `string`                                      | Restricts invocation to a specific source AWS account                       |

#### `invoke.role` Options

| Option      | Type             | Description                                                  |
| ----------- | ---------------- | ---------------------------------------------------------- |
| `principal` | `string`         | Trust principal allowed to assume the invoke role          |
| `services`  | `ServicesValues` | Additional IAM policy statements to attach to the role     |
| `ref`       | `string`         | Name to register the created role as a global reference    |

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
    description: 'Processes a payment request',
    ref: 'processPaymentLambda',
    invoke: {
      permission: {
        principal: 'apigateway.amazonaws.com',
      },
      role: {
        principal: 'apigateway.amazonaws.com',
        services: [
          {
            type: 'lambda',
            permissions: ['InvokeFunction'],
            resources: ['*'],
          },
        ],
        ref: 'processPaymentInvokeRole',
      },
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
