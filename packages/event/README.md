# @lafken/event

Listen and react to Amazon EventBridge events using TypeScript decorators. `@lafken/event` lets you define event rules with pattern-based filtering and automatically connects them to Lambda functions. Supports custom events, S3 notifications, and DynamoDB stream events.

## Installation

```bash
npm install @lafken/event
```

## Getting Started

Define an event rule class with `@EventRule`, add `@Rule` methods with event patterns, and register everything through `EventRuleResolver`:

```typescript
import { createApp, createModule } from '@lafken/main';
import { EventRuleResolver } from '@lafken/event/resolver';
import { EventRule, Rule, Event } from '@lafken/event/main';

// 1. Define event handlers
@EventRule()
export class OrderEvents {
  @Rule({
    pattern: {
      source: 'orders',
      detailType: ['order.created'],
    },
  })
  onOrderCreated(@Event() event: any) {
    console.log('New order:', event);
  }
}

// 2. Register in a module
const orderModule = createModule({
  name: 'order',
  resources: [OrderEvents],
});

// 3. Add the resolver to the app
createApp({
  name: 'my-app',
  resolvers: [new EventRuleResolver({ busName: 'my-event-bus' })],
  modules: [orderModule],
});
```

Each `@Rule` method becomes an independent Lambda function triggered by matching EventBridge events. The event payload is automatically passed through `$.detail`.

## Features

### Event Rule Class

Use the `@EventRule` decorator to group related event handlers in a single class:

```typescript
import { EventRule, Rule, Event } from '@lafken/event/main';

@EventRule()
export class InventoryEvents {
  @Rule({
    pattern: {
      source: 'inventory',
      detailType: ['stock.updated'],
    },
  })
  onStockUpdate(@Event() event: any) { }

  @Rule({
    pattern: {
      source: 'inventory',
      detailType: ['stock.depleted'],
    },
  })
  onStockDepleted(@Event() event: any) { }
}
```

### Custom Events

Define rules that match custom events by specifying `source`, `detailType`, and `detail` filters:

```typescript
@Rule({
  pattern: {
    source: 'payments',
    detailType: ['payment.completed', 'payment.refunded'],
    detail: {
      currency: ['USD', 'EUR'],
    },
  },
})
onPaymentEvent(@Event() event: any) {
  // Triggered only for USD or EUR payments
}
```

#### Pattern Fields

| Field        | Type       | Description                                          |
| ------------ | ---------- | ---------------------------------------------------- |
| `source`     | `string`   | Event source identifier (required)                   |
| `detailType` | `string[]` | Event type names to match                            |
| `detail`     | `object`   | Attribute-level filtering on the event payload       |

### S3 Integration

Listen for S3 bucket notifications delivered through EventBridge. Set `integration: 's3'` and define a pattern matching the S3 event structure:

```typescript
@Rule({
  integration: 's3',
  pattern: {
    detailType: ['Object Created'],
    detail: {
      bucket: {
        name: ['uploads-bucket'],
      },
      object: {
        key: [{ prefix: 'images/' }],
      },
    },
  },
})
onImageUploaded(@Event() event: any) {
  // Triggered when a new object is created under images/
}
```

#### S3 Pattern Options

| Field                 | Type                               | Description                                  |
| --------------------- | ---------------------------------- | -------------------------------------------- |
| `detailType`          | `S3DetailType[]`                   | `'Object Created'` or `'Object Deleted'`     |
| `detail.bucket.name`  | `string[]`                         | Bucket names to match                        |
| `detail.object.key`   | `(string \| S3ObjectKey)[]`        | Object keys or prefix/suffix patterns        |

Object key filters support `prefix` and `suffix` matching:

```typescript
detail: {
  object: {
    key: [
      { prefix: 'uploads/' },
      { suffix: '.pdf' },
      'exact-filename.txt',
    ],
  },
}
```

### DynamoDB Integration

Consume events from DynamoDB Streams routed through EventBridge. The target table must have streams enabled (see `@lafken/dynamo` stream configuration). Set `integration: 'dynamodb'` and use `source` to specify the table name:

```typescript
@Rule({
  integration: 'dynamodb',
  pattern: {
    source: 'customers',
    detail: {
      eventName: ['INSERT', 'MODIFY'],
      newImage: {
        status: ['active'],
      },
    },
  },
})
onCustomerChange(@Event() event: any) {
  // Triggered on INSERT or MODIFY where status is 'active'
}
```

#### DynamoDB Pattern Options

| Field              | Type                                    | Description                                   |
| ------------------ | --------------------------------------- | --------------------------------------------- |
| `source`           | `string`                                | DynamoDB table name                           |
| `detail.eventName` | `('INSERT' \| 'MODIFY' \| 'REMOVE')[]` | Stream event types to match                   |
| `detail.keys`      | `DynamoAttributeFilters`                | Filter by primary key values                  |
| `detail.newImage`  | `DynamoAttributeFilters`                | Filter by new item attributes (after change)  |
| `detail.oldImage`  | `DynamoAttributeFilters`                | Filter by old item attributes (before change) |

Attribute filters support EventBridge content-based filtering patterns:

```typescript
detail: {
  keys: {
    email: ['user@example.com'],
    age: [{ numeric: ['>', 18] }],
  },
  newImage: {
    name: [{ prefix: 'A' }],
    role: [{ 'anything-but': 'admin' }],
  },
}
```

#### Available Filter Patterns

| Pattern               | Example                                   | Description                        |
| --------------------- | ----------------------------------------- | ---------------------------------- |
| Exact match           | `'value'`                                 | Matches exact string or number     |
| `prefix`              | `{ prefix: 'usr_' }`                     | Starts with                        |
| `suffix`              | `{ suffix: '.com' }`                     | Ends with                          |
| `anything-but`        | `{ 'anything-but': 'admin' }`            | Matches everything except          |
| `numeric`             | `{ numeric: ['>', 100] }`                | Numeric comparison                 |
| `numeric` (range)     | `{ numeric: ['>=', 0, '<', 100] }`       | Numeric range                      |
| `exists`              | `{ exists: true }`                        | Field exists or does not exist     |
| `equals-ignore-case`  | `{ 'equals-ignore-case': 'active' }`     | Case-insensitive string match      |

### Receiving Events

Use the `@Event` parameter decorator to inject the EventBridge event payload into a handler method. The payload is automatically extracted from `$.detail`:

```typescript
@Rule({
  pattern: {
    source: 'notifications',
    detailType: ['notification.sent'],
  },
})
onNotification(@Event() event: any) {
  // event contains the detail object, not the full EventBridge envelope
  console.log(event.recipientId, event.channel);
}
```

### Event Buses

Configure one or more custom event buses when initializing `EventRuleResolver`. Each `@Rule` can target a specific bus via the `bus` option. If omitted, the default EventBridge bus is used:

```typescript
import { EventRuleResolver } from '@lafken/event/resolver';

createApp({
  name: 'my-app',
  resolvers: [
    new EventRuleResolver(
      {
        busName: 'orders-bus',
        extend: ({ eventBus, scope }) => {
          // Apply additional CDKTN configuration
        },
      },
      {
        busName: 'notifications-bus',
      }
    ),
  ],
});
```

Reference a specific bus from a rule:

```typescript
@Rule({
  bus: 'orders-bus',
  pattern: {
    source: 'checkout',
    detailType: ['checkout.completed'],
  },
})
onCheckout(@Event() event: any) { }
```

### Retry Policy

Configure how EventBridge handles failed target invocations using `retryAttempts` and `maxEventAge`:

```typescript
@Rule({
  retryAttempts: 3,
  maxEventAge: 7200,
  pattern: {
    source: 'billing',
    detailType: ['invoice.generated'],
  },
})
onInvoice(@Event() event: any) {
  // Retries up to 3 times, discards events older than 2 hours
}
```

| Option          | Type     | Description                                                |
| --------------- | -------- | ---------------------------------------------------------- |
| `retryAttempts` | `number` | Maximum retry attempts if the target invocation fails      |
| `maxEventAge`   | `number` | Maximum event age in seconds before the event is discarded |
