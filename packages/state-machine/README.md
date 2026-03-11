# @lafken/state-machine

Define AWS Step Functions state machines using TypeScript decorators. `@lafken/state-machine` lets you declare states, transitions, service integrations, and nested workflows directly within your classes — no raw JSON or ASL required.

> [!NOTE]
> This library exclusively supports **JSONata** for data transformation and querying. **JSONPath is not supported**.

## Installation

```bash
npm install @lafken/state-machine
```

## Getting Started

Register the `StateMachineResolver` in your application and define your first workflow:

```typescript
import { createApp, createModule } from '@lafken/main';
import { StateMachineResolver } from '@lafken/state-machine/resolver';
import { StateMachine, State, Event } from '@lafken/state-machine/main';

// 1. Define the state machine
@StateMachine({
  startAt: 'processOrder',
})
class OrderWorkflow {
  @State({ next: 'notifyCustomer' })
  processOrder(@Event('{% $states.input %}') order: any) {
    return { orderId: order.id, status: 'processed' };
  }

  @State({ end: true })
  notifyCustomer(@Event('{% $states.input %}') data: any) {
    console.log(`Order ${data.orderId} completed`);
  }
}

// 2. Register it in a module
const orderModule = createModule({
  name: 'orders',
  resources: [OrderWorkflow],
});

// 3. Add the resolver to your app
createApp({
  name: 'my-app',
  resolvers: [new StateMachineResolver()],
  modules: [orderModule],
});
```

## Features

### Defining a State Machine

Use the `@StateMachine` decorator to mark a class as a state machine resource. The `startAt` property defines the entry point of the workflow and must reference either a method name or an inline state definition.

```typescript
import { StateMachine, State } from '@lafken/state-machine/main';

@StateMachine({
  startAt: 'validate',
})
export class PaymentWorkflow {
  @State({ next: 'charge' })
  validate(@Event('{% $states.input %}') input: any) {
    return { amount: input.amount, valid: true };
  }

  @State({ end: true })
  charge(@Event('{% $states.input %}') input: any) {
    return { charged: input.amount };
  }
}
```

You can also start with a declarative state instead of a Lambda task:

```typescript
@StateMachine({
  startAt: {
    type: 'wait',
    seconds: 5,
    next: { type: 'succeed' },
  },
})
export class DelayedWorkflow {}
```

### Lambda Tasks

The `@State` decorator turns a method into a Lambda-backed task within the state machine. Step Functions will invoke the Lambda automatically during execution.

Use `next` to chain to the following state, or `end: true` to mark it as a terminal state:

```typescript
@StateMachine({ startAt: 'enrich' })
export class DataPipeline {
  @State({ next: 'store' })
  enrich(@Event('{% $states.input %}') record: any) {
    return { ...record, enrichedAt: new Date().toISOString() };
  }

  @State({ end: true })
  store(@Event('{% $states.input %}') record: any) {
    console.log('Storing record:', record);
  }
}
```

#### Output Transformation

Use the `output` option to transform a state's result before passing it to the next state. It accepts a JSONata expression or a plain object:

```typescript
@State({
  next: 'process',
  output: '{% $states.result.data %}',
})
fetchData() {
  return { data: { items: [1, 2, 3] }, metadata: {} };
}
```

#### State Assignment

Use `assign` to add or update values in the state machine context. Assigned values persist across subsequent states:

```typescript
@State({
  next: 'sendEmail',
  assign: { attemptCount: '{% $states.input.attemptCount + 1 %}' },
})
retry(@Event('{% $states.input %}') input: any) {
  return input;
}
```

### AWS Service Integrations

Instead of invoking a Lambda function, a state can directly call an AWS service API. Use the `integrationResource` property to specify the service ARN, and the `@IntegrationOptions` decorator to access resource references.

This pattern eliminates the need for intermediate Lambda functions when you just need to call an AWS service (DynamoDB, SQS, SNS, etc.).

```typescript
import {
  StateMachine,
  State,
  Event,
  type IntegrationOptionsParams,
} from '@lafken/state-machine/main';
import { IntegrationOptions } from '@lafken/api/main';

@StateMachine({
  startAt: 'saveItem',
  services: ['dynamodb'],
})
export class InventoryWorkflow {
  @State({
    integrationResource: 'arn:aws:states:::dynamodb:putItem',
    next: 'confirm',
  })
  saveItem(@IntegrationOptions() { getResourceValue }: IntegrationOptionsParams) {
    return {
      TableName: getResourceValue('dynamo::inventory', 'id'),
      Item: {
        sku: { S: '{% $states.input.sku %}' },
        quantity: { N: '{% $string($states.input.quantity) %}' },
      },
    };
  }

  @State({ end: true })
  confirm(@Event('{% $states.input %}') e: any) {
    console.log('Item saved successfully');
  }
}
```

A read example using `getItem`:

```typescript
@State({
  integrationResource: 'arn:aws:states:::dynamodb:getItem',
  next: 'processResult',
  output: '{% $states.result.Item %}',
})
lookupUser(@IntegrationOptions() { getResourceValue }: IntegrationOptionsParams) {
  return {
    TableName: getResourceValue('dynamo::users', 'id'),
    Key: {
      email: { S: '{% $states.input.email %}' },
    },
  };
}
```

### Nested State Machines

Complex workflows often require sub-workflows for parallel execution or iteration over collections. Use `@NestedStateMachine` to define these embedded workflows.

#### Map State

A Map state iterates over a collection and executes a set of states for each item:

```typescript
import { StateMachine, NestedStateMachine, State, Event } from '@lafken/state-machine/main';

@NestedStateMachine({
  startAt: 'processItem',
})
class ItemProcessor {
  @State({ end: true })
  processItem(@Event('{% $states.input %}') item: any) {
    return { id: item.id, processed: true };
  }
}

@StateMachine({
  startAt: {
    type: 'map',
    mode: 'inline',
    items: '{% $states.input.items %}',
    states: ItemProcessor,
    end: true,
  },
})
export class BatchWorkflow {}
```

#### Parallel State

A Parallel state runs multiple branches concurrently. Each branch is a class decorated with `@NestedStateMachine`:

```typescript
@NestedStateMachine({ startAt: 'sendEmail' })
class EmailBranch {
  @State({ end: true })
  sendEmail(@Event('{% $states.input %}') e: any) {
    console.log('Sending email...');
  }
}

@NestedStateMachine({ startAt: 'sendSms' })
class SmsBranch {
  @State({ end: true })
  sendSms(@Event('{% $states.input %}') e: any) {
    console.log('Sending SMS...');
  }
}

@StateMachine({
  startAt: {
    type: 'parallel',
    branches: [EmailBranch, SmsBranch],
    end: true,
  },
})
export class NotificationWorkflow {}
```

### Choice State

Use the `choice` type in `startAt` or `next` to define conditional branching based on JSONata expressions:

```typescript
@StateMachine({
  startAt: {
    type: 'choice',
    choices: [
      {
        condition: '{% $states.input.priority = "high" %}',
        next: 'expedite',
      },
      {
        condition: '{% $states.input.priority = "low" %}',
        next: 'enqueue',
      },
    ],
    default: { type: 'fail', error: 'UnknownPriority', cause: 'Priority not recognized' },
  },
})
export class RoutingWorkflow {
  @State({ end: true })
  expedite(@Event('{% $states.input %}') e: any) {
    return { routed: 'express' };
  }

  @State({ end: true })
  enqueue(@Event('{% $states.input %}') e: any) {
    return { routed: 'standard' };
  }
}
```

### Error Handling

States support `retry` and `catch` configurations for resilient workflows:

```typescript
@State({
  next: 'done',
  retry: [
    {
      errorEquals: ['States.TaskFailed'],
      intervalSeconds: 2,
      maxAttempt: 3,
      backoffRate: 2,
    },
  ],
  catch: [
    {
      errorEquals: ['States.ALL'],
      next: { type: 'fail', error: 'ProcessingError', cause: 'Task failed after retries' },
    },
  ],
})
riskyOperation(@Event('{% $states.input %}') input: any) {
  // This operation will be retried up to 3 times on failure
  return { result: 'done' };
}
```

### State Events & Payloads

Each `@State` method can receive input data through the `@Event` decorator. You can pass either a JSONata expression or a typed `@Payload` class.

#### JSONata Expression

Extract or transform the incoming event inline:

```typescript
@State({ end: true })
handle(@Event('{% $states.input.user %}') user: { name: string; role: string }) {
  console.log(`User: ${user.name}, Role: ${user.role}`);
}
```

#### Typed Payload

Define a structured payload class with `@Payload` and `@Param` decorators for clear, declarative input mapping:

```typescript
import { Payload, Param } from '@lafken/state-machine/main';

@Payload()
export class InvoiceInput {
  @Param({ context: 'input', source: 'invoiceId' })
  invoiceId: string;

  @Param({ context: 'input', source: 'lineItems', type: [Number] })
  lineItems: number[];

  @Param({ context: 'execution', source: 'id' })
  executionId: string;
}

@StateMachine({ startAt: 'generateInvoice' })
export class InvoiceWorkflow {
  @State({ next: 'send' })
  generateInvoice(@Event(InvoiceInput) input: InvoiceInput) {
    return { id: input.invoiceId, total: input.lineItems.reduce((a, b) => a + b, 0) };
  }

  @State({ end: true })
  send(@Event('{% $states.input %}') invoice: any) {
    console.log('Sending invoice:', invoice.id);
  }
}
```

Available `@Param` contexts:

| Context          | Description                                 | Example sources                        |
| ---------------- | ------------------------------------------- | -------------------------------------- |
| `input`          | Values from the state input                 | Any field name (e.g. `'orderId'`)      |
| `execution`      | Execution metadata                          | `'id'`, `'name'`, `'start_time'`       |
| `state`          | Current state metadata                      | `'entered_time'`, `'name'`             |
| `state_machine`  | State machine metadata                      | `'id'`, `'name'`                       |
| `task`           | Task metadata                               | `'token'`                              |
| `custom`         | A hardcoded value                           | Use `value` instead of `source`        |
| `jsonata`        | A dynamic JSONata expression                | Use `value` with a JSONata string      |
