# @lafken/event

`@lafken/event` helps you create listeners for EventBridge events and trigger Lambda functions to process those events. It provides decorators that simplify configuring event listeners—whether for custom events or built-in sources like S3 and DynamoDB.

## Installation

```bash
npm install @lafken/event
```

## Configuration

Add the EventRuleResolver from the @lafken/event/resolver library.
In its configuration, you can define one or more event buses. If no event bus is provided, the default EventBridge bus will be used for communication.

```typescript
import { ApiResolver } from '@lafken/event/resolver';

createApp({
  name: 'awesome-app',
  resolvers: [
    new EventRuleResolver({
      busName: 'awesome-event-bus',
      extend: ({ eventBus }) => {
        // ... extend the event bus
      },
    }),
  ],
  ...
});
```

This setup allows you to customize how events are routed and processed within your application.

Next, you need to configure the module by importing the class resources decorated with the @EventRule decorator. These classes must contain methods decorated with @Rule, which will create the event listener and attach the corresponding Lambda function for execution.

```typescript
@EventRule({
  minify: false,
})
export class GreetingEvent {
  @Rule({
    bus: 'awesome-event-bus',
    pattern: {
      source: 'simple-source',
    },
  })
  simpleEvent(@Event() e: any) {
    // ...
  }
}

const greetingModule = createModule({
  name: 'greeting',
  resources: [
    GreetingEvent
  ]
});
```

## Features

### Receiving and Filtering Events
The @Rule decorator allows you to define an event pattern by specifying the event source and applying filters on detail and detailType.

```typescript
@Rule({
  pattern: {
    source: 'simple-source',
    detail: {
      name: ['foo', 'bar'],
    },
    detailType: ['CREATE', 'UPDATE'],
  },
})
// ...
```

### Receiving Events
To access the payload sent by an event, you must use the @Event decorator. This decorator automatically maps the event’s inputPath to $.detail, allowing you to receive the event data directly as a parameter.

```typescript
@Rule(/* ... */)
sayHelloFromEvent(@Event() event: any) {
  console.log('simple source', event);
}
```
### S3 integrations
Event rules also support integration with Amazon S3 through EventBridge-enabled bucket notifications.
When this integration is enabled, S3 events are delivered to EventBridge, allowing fine-grained filtering based on event metadata such as the bucket name, object key, and event type.

To enable S3 integration within an event rule, set the integration property to 's3' and define a pattern that matches the desired S3 event structure.

```typescript
@Rule({
  integration: 's3',
  pattern: {
    detailType: ['Object Created'],
    detail: {
      bucket: {
        name: ['lafken-example-documents'],
      },
      object: {
        key: [
          {
            prefix: 'test.json',
          },
        ],
      },
    },
  },
})
s3(@Event() event: any) {
  // Handler logic
}
```

### Dynamo Integration
Event rules can also consume and process events emitted by Amazon DynamoDB Streams.
To use this integration, you must first enable DynamoDB Streams on the target table. Once enabled, DynamoDB will emit change records (INSERT, MODIFY, REMOVE), which can be routed through EventBridge and processed by your rule.

After the stream is configured, you can define a rule with the integration: 'dynamodb' option and provide a pattern to filter the specific DynamoDB events you want to handle.

```typescript
@Rule({
  integration: 'dynamodb',
  pattern: {
    source: 'clients',
    detail: {
      eventName: ['INSERT', 'MODIFY'],
      keys: {
        email: {
          prefix: 'awesome',
        },
      },
    },
  },
})
dynamo(@Event() e: any) {
  // ...
}
```

### Event bus

It is possible to configure multiple Event Buses when initializing the EventRuleResolver. Each event bus can then be referenced from individual rules by specifying its name in the bus property of the @Rule decorator.

If no event bus is explicitly configured for a rule, the default EventBridge bus will be used automatically.


```typescript
//...
new EventRuleResolver({
  busName: 'awesome-event-bus',
  extend: ({ eventBus }) => {
    // ... extend the event bus
  },
}, {
  busName: 'another-event-bus'
}),
// ...
```
