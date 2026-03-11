# @lafken/queue

Define and consume Amazon SQS queues using TypeScript decorators. `@lafken/queue` lets you declare Standard and FIFO queues, map message data to typed handler parameters, and send messages at runtime through a built-in service client.

## Installation

```bash
npm install @lafken/queue
```

## Getting Started

Define a queue class with `@Queue`, add consumer methods with `@Standard` or `@Fifo`, and register everything through `QueueResolver`:

```typescript
import { createApp, createModule } from '@lafken/main';
import { QueueResolver } from '@lafken/queue/resolver';
import { Queue, Standard, Payload, Param, Event } from '@lafken/queue/main';

// 1. Define the message payload
@Payload()
export class OrderMessage {
  @Param({ source: 'body', parse: true })
  orderId: string;

  @Param({ source: 'body', parse: true })
  total: number;
}

// 2. Define the queue and its consumer
@Queue()
export class OrderQueue {
  @Standard({ batchSize: 5, visibilityTimeout: 60 })
  processOrder(@Event(OrderMessage) message: OrderMessage) {
    console.log(`Processing order ${message.orderId}`);
  }
}

// 3. Register in a module
const orderModule = createModule({
  name: 'order',
  resources: [OrderQueue],
});

// 4. Add the resolver to the app
createApp({
  name: 'my-app',
  resolvers: [new QueueResolver()],
  modules: [orderModule],
});
```

Each `@Standard` or `@Fifo` method becomes an independent Lambda function with its own SQS queue and event source mapping.

## Features

### Queue Class

Use the `@Queue` decorator to group related queue consumers in a single class. A queue class can contain multiple `@Standard` and `@Fifo` handlers:

```typescript
import { Queue, Standard, Fifo } from '@lafken/queue/main';

@Queue()
export class NotificationQueue {
  @Standard({ queueName: 'email-notifications' })
  sendEmail() { }

  @Fifo({ queueName: 'sms-notifications', contentBasedDeduplication: true })
  sendSms() { }
}
```

### Standard Queues

Use the `@Standard` decorator to create a standard (non-FIFO) SQS queue consumer. Messages are delivered at least once with best-effort ordering:

```typescript
@Standard({
  queueName: 'reports',
  batchSize: 10,
  visibilityTimeout: 120,
  maxConcurrency: 5,
})
generateReport(@Event(ReportMessage) message: ReportMessage) {
  // Process up to 10 messages per invocation
}
```

If `queueName` is omitted, the method name is used as the queue name.

#### Standard Queue Options

| Option                | Type     | Description                                                        |
| --------------------- | -------- | ------------------------------------------------------------------ |
| `queueName`           | `string` | Queue name (defaults to the method name)                           |
| `batchSize`           | `1–10`   | Number of messages per Lambda invocation                           |
| `visibilityTimeout`   | `number` | Seconds a message is hidden from other consumers while processing  |
| `deliveryDelay`       | `number` | Seconds to delay message delivery after it is sent                 |
| `retentionPeriod`     | `number` | Seconds messages are retained before automatic deletion            |
| `maxMessageSizeBytes` | `number` | Maximum message size in bytes                                      |
| `maxConcurrency`      | `number` | Maximum concurrent Lambda invocations for this queue               |
| `maxBatchingWindow`   | `number` | Seconds to wait gathering messages into a batch before invoking    |
| `lambda`              | `object` | Lambda-specific configuration (memory, timeout, etc.)              |

### FIFO Queues

Use the `@Fifo` decorator for FIFO (First-In-First-Out) queues. FIFO queues guarantee exactly-once processing and strict message ordering. The queue name automatically gets a `.fifo` suffix:

```typescript
@Fifo({
  queueName: 'payment-processing',
  contentBasedDeduplication: true,
  batchSize: 1,
})
processPayment(@Event(PaymentMessage) message: PaymentMessage) {
  // Messages are processed in exact send order
}
```

FIFO queues support all standard queue options plus:

| Option                      | Type      | Description                                                     |
| --------------------------- | --------- | --------------------------------------------------------------- |
| `contentBasedDeduplication` | `boolean` | Use message content to generate deduplication IDs automatically |

> [!NOTE]
> FIFO queues automatically enable `ReportBatchItemFailures`, allowing partial batch failure reporting.

### Message Payload

Use `@Payload` on a class to define the structure of SQS messages. Decorate each property with `@Param` to specify where the value is extracted from in the SQS record:

```typescript
import { Payload, Param } from '@lafken/queue/main';

@Payload()
export class TaskMessage {
  @Param({ source: 'attribute', type: String })
  correlationId: string;

  @Param({ source: 'body', parse: true })
  taskName: string;

  @Param({ source: 'body', parse: true })
  priority: number;
}
```

#### @Param Options

| Option   | Type                      | Default       | Description                                      |
| -------- | ------------------------- | ------------- | ------------------------------------------------ |
| `source` | `'attribute' \| 'body'`   | `'attribute'` | Where to extract the value from the SQS record   |
| `parse`  | `boolean`                 | `false`       | JSON-parse the message body before extraction     |
| `type`   | `String \| Number \| ...` | inferred      | Data type of the extracted value                  |
| `name`   | `string`                  | property name | Override the field name used for extraction       |

- **`source: 'attribute'`** — reads from SQS message attributes (supports `String` and `Number` types)
- **`source: 'body'`** — reads from the message body. Set `parse: true` to JSON-parse the body and extract a specific field

> [!NOTE]
> Only one `@Param` with `source: 'body'` and `parse: false` (raw body) is allowed per handler.

#### @Field Decorator

Use `@Field` to include a property in the payload schema without specifying an extraction source:

```typescript
import { Payload, Field } from '@lafken/queue/main';

@Payload()
export class SimpleMessage {
  @Field()
  action: string;

  @Field()
  timestamp: number;
}
```

### Consuming Messages

Bind a typed payload to a handler method using the `@Event` parameter decorator. Pass the payload class so the framework can automatically extract and map fields from the SQS record at runtime:

```typescript
import { Queue, Standard, Event } from '@lafken/queue/main';

@Queue()
export class AlertQueue {
  @Standard({ queueName: 'alerts', batchSize: 5 })
  processAlert(@Event(AlertMessage) alert: AlertMessage) {
    console.log(`Alert from ${alert.source}: ${alert.message}`);
  }
}
```

### Sending Messages

Use `QueueService` at runtime to send messages to any SQS queue:

```typescript
import { QueueService } from '@lafken/queue/service';

// Send a single message
await QueueService.sendMessage({
  url: 'https://sqs.us-east-1.amazonaws.com/123456789/orders',
  body: { orderId: 'ord-123', total: 49.99 },
  delay: 10,
});

// Send to a FIFO queue
await QueueService.sendMessage({
  url: 'https://sqs.us-east-1.amazonaws.com/123456789/payments.fifo',
  body: { paymentId: 'pay-456', amount: 100 },
  groupId: 'customer-789',
  deduplicationId: 'pay-456',
});
```

#### SendMessage Options

| Option              | Type                               | Description                                        |
| ------------------- | ---------------------------------- | -------------------------------------------------- |
| `url`               | `string`                           | Full SQS queue URL                                 |
| `body`              | `any`                              | Message body (automatically JSON-stringified)      |
| `attributes`        | `Record<string, string \| number>` | SQS message attributes                            |
| `delay`             | `number`                           | Delay in seconds before the message becomes visible |
| `groupId`           | `string`                           | Message group ID (FIFO queues only)                |
| `deduplicationId`   | `string`                           | Deduplication ID (FIFO queues only)                |

### Sending Batch Messages

Send multiple messages in a single API call:

```typescript
import { QueueService } from '@lafken/queue/service';

await QueueService.sendBatchMessage({
  url: 'https://sqs.us-east-1.amazonaws.com/123456789/tasks',
  messages: [
    { body: { task: 'resize-image', fileId: 'f1' } },
    { body: { task: 'resize-image', fileId: 'f2' }, delay: 30 },
    { body: { task: 'generate-thumbnail', fileId: 'f3' } },
  ],
});
```
