# @lafken/dynamo

Define and manage DynamoDB tables using TypeScript decorators. `@lafken/dynamo` lets you declare table schemas, indexes, streams, and TTL directly in your classes — and provides a type-safe repository for performing operations at runtime.

## Installation

```bash
npm install @lafken/dynamo
```

## Getting Started

Define a table class with `@Table`, register it in the `DynamoResolver`, and use `createRepository` to interact with it:

```typescript
import { createApp } from '@lafken/main';
import { DynamoResolver } from '@lafken/dynamo/resolver';
import { Table, PartitionKey, SortKey, Field, type PrimaryPartition } from '@lafken/dynamo/main';
import { createRepository } from '@lafken/dynamo/service';

// 1. Define the table schema
@Table({ name: 'contacts' })
export class Contact {
  @PartitionKey(String)
  email: PrimaryPartition<string>;

  @SortKey(String)
  company: PrimaryPartition<string>;

  @Field()
  name: string;

  @Field()
  age: number;
}

// 2. Create a repository for runtime operations
export const contactRepository = createRepository(Contact);

// 3. Register the table in the resolver
createApp({
  name: 'my-app',
  resolvers: [
    new DynamoResolver([Contact]),
  ],
});
```

## Features

### Defining a Table

Use the `@Table` decorator on a class to declare a DynamoDB table. Each property decorated with `@PartitionKey`, `@SortKey`, or `@Field` becomes an attribute in the table schema.

Every table requires exactly one `@PartitionKey`. A `@SortKey` is optional and creates a composite primary key. Both accept `String` or `Number` as the key type.

```typescript
import { Table, PartitionKey, SortKey, Field, type PrimaryPartition } from '@lafken/dynamo/main';

@Table({ name: 'events' })
export class EventLog {
  @PartitionKey(String)
  source: PrimaryPartition<string>;

  @SortKey(Number)
  timestamp: PrimaryPartition<number>;

  @Field()
  payload: string;

  @Field({ type: Number })
  severity: number;
}
```

The `@Field` decorator registers a regular attribute. Its type is inferred automatically, but can be overridden with the `type` option.

### Indexes

Secondary indexes enable alternative query patterns. Define them in the `indexes` option of `@Table`.

#### Local Secondary Index

Shares the same partition key as the table but uses a different sort key:

```typescript
@Table({
  name: 'orders',
  indexes: [
    {
      type: 'local',
      name: 'orders_by_total',
      sortKey: 'total',
    },
  ],
})
export class Order {
  @PartitionKey(String)
  customerId: PrimaryPartition<string>;

  @SortKey(String)
  orderId: PrimaryPartition<string>;

  @Field()
  total: number;

  @Field()
  status: string;
}
```

#### Global Secondary Index

Has its own partition key and optional sort key, enabling queries across the entire table:

```typescript
@Table({
  name: 'orders',
  indexes: [
    {
      type: 'global',
      name: 'orders_by_status',
      partitionKey: 'status',
      sortKey: 'total',
      projection: ['customerId', 'orderId'],
    },
  ],
})
export class Order {
  @PartitionKey(String)
  customerId: PrimaryPartition<string>;

  @SortKey(String)
  orderId: PrimaryPartition<string>;

  @Field()
  total: number;

  @Field()
  status: string;
}
```

Use `projection` to control which attributes are included in the index. Pass an array of field names or `'ALL'` to project every attribute.

### TTL (Time to Live)

Enable automatic item expiration by specifying the `ttl` option with the name of a numeric field. DynamoDB will delete items whose TTL value (Unix timestamp in seconds) has passed:

```typescript
@Table({
  name: 'sessions',
  ttl: 'expiresAt',
})
export class Session {
  @PartitionKey(String)
  sessionId: PrimaryPartition<string>;

  @Field()
  userId: string;

  @Field()
  expiresAt: number;
}
```

### Streams

Enable a DynamoDB Stream to capture item-level changes. When enabled, the stream is automatically connected to EventBridge via EventBridge Pipes, allowing other services to react to table changes in near real-time.

Use the `@lafken/event` package to consume and process these stream events.

```typescript
@Table({
  name: 'notifications',
  stream: {
    enabled: true,
    type: 'NEW_AND_OLD_IMAGES',
    batchSize: 10,
    maximumBatchingWindowInSeconds: 5,
  },
})
export class Notification {
  @PartitionKey(String)
  id: PrimaryPartition<string>;

  @Field()
  channel: string;

  @Field()
  message: string;
}
```

#### Stream Filters

Apply filters to process only specific change events, reducing unnecessary invocations:

```typescript
@Table({
  name: 'notifications',
  stream: {
    enabled: true,
    type: 'NEW_IMAGE',
    filters: {
      eventName: ['INSERT'],
      newImage: {
        channel: ['email', 'sms'],
      },
    },
  },
})
export class Notification {
  @PartitionKey(String)
  id: PrimaryPartition<string>;

  @Field()
  channel: string;

  @Field()
  message: string;
}
```

Available filter criteria:

| Filter      | Description                                            |
| ----------- | ------------------------------------------------------ |
| `eventName` | Event types: `'INSERT'`, `'MODIFY'`, `'REMOVE'`       |
| `keys`      | Filter by partition/sort key values                    |
| `newImage`  | Conditions on the new item (after INSERT or MODIFY)    |
| `oldImage`  | Conditions on the old item (before MODIFY or REMOVE)   |

### Billing Mode

Tables default to `pay_per_request` (on-demand). For provisioned throughput, set `billingMode` and specify capacity units:

```typescript
@Table({
  name: 'high-throughput',
  billingMode: 'provisioned',
  readCapacity: 100,
  writeCapacity: 50,
})
export class HighThroughputTable {
  @PartitionKey(String)
  id: PrimaryPartition<string>;

  @Field()
  data: string;
}
```

### Global Tables (Replicas)

Create multi-region replicas for global applications using the `replica` option:

```typescript
@Table({
  name: 'global-config',
  replica: [
    { regionName: 'eu-west-1', consistenceMode: 'EVENTUAL' },
    { regionName: 'ap-southeast-1' },
  ],
})
export class GlobalConfig {
  @PartitionKey(String)
  key: PrimaryPartition<string>;

  @Field()
  value: string;
}
```

### Repository

`createRepository` provides a type-safe API for DynamoDB operations at runtime. All methods return a builder that is executed by calling `.exec()`.

```typescript
import { createRepository } from '@lafken/dynamo/service';

export const contactRepository = createRepository(Contact);
```

#### Create

Insert a new item into the table:

```typescript
await contactRepository
  .create({
    email: 'jane@example.com',
    company: 'Acme',
    name: 'Jane Doe',
    age: 30,
  })
  .exec();
```

#### Find All

Query items using a key condition. Supports filtering, projections, pagination, and sort direction:

```typescript
const result = await contactRepository
  .findAll({
    keyCondition: {
      partition: { email: 'jane@example.com' },
    },
    filter: {
      age: { greaterThan: 25 },
    },
    projection: ['name', 'company'],
    sortDirection: 'desc',
    limit: 10,
  })
  .exec();

// result.data    → matched items
// result.cursor  → pagination cursor for the next page
```

#### Find One

Retrieve a single item matching a key condition:

```typescript
const item = await contactRepository
  .findOne({
    keyCondition: {
      partition: { email: 'jane@example.com' },
      sort: { company: 'Acme' },
    },
  })
  .exec();
```

#### Scan

Scan the entire table with optional filters:

```typescript
const all = await contactRepository
  .scan({
    filter: {
      age: { greaterThan: 18 },
    },
    limit: 50,
  })
  .exec();
```

#### Update

Update specific attributes of an existing item:

```typescript
await contactRepository
  .update({
    keyCondition: {
      email: 'jane@example.com',
      company: 'Acme',
    },
    setValues: {
      age: 31,
    },
    replaceValues: {
      name: 'Jane Smith',
    },
  })
  .exec();
```

Update supports three operation types:

| Operation       | Description                                                      |
| --------------- | ---------------------------------------------------------------- |
| `setValues`     | Update specific nested fields without overwriting the object     |
| `replaceValues` | Replace entire attribute values                                  |
| `removeValues`  | Remove attributes from the item                                  |

Numeric fields support `incrementValue` and `decrementValue`, and any field supports `ifNotExistValue` for conditional defaults:

```typescript
await contactRepository
  .update({
    keyCondition: { email: 'jane@example.com', company: 'Acme' },
    setValues: {
      age: { incrementValue: 1 },
    },
  })
  .exec();
```

#### Upsert

Insert an item or update it if it already exists:

```typescript
await contactRepository
  .upsert({
    email: 'jane@example.com',
    company: 'Acme',
    name: 'Jane Doe',
    age: 30,
  })
  .exec();
```

#### Delete

Remove an item by its primary key:

```typescript
await contactRepository
  .delete({
    email: 'jane@example.com',
    company: 'Acme',
  })
  .exec();
```

#### Bulk Operations

Create or delete multiple items at once:

```typescript
// Bulk create
await contactRepository
  .bulkCreate([
    { email: 'a@example.com', company: 'X', name: 'Alice', age: 28 },
    { email: 'b@example.com', company: 'Y', name: 'Bob', age: 35 },
  ])
  .exec();

// Bulk delete
await contactRepository
  .bulkDelete([
    { email: 'a@example.com', company: 'X' },
    { email: 'b@example.com', company: 'Y' },
  ])
  .exec();
```

#### Querying an Index

Specify `indexName` in your query to use a secondary index:

```typescript
const result = await orderRepository
  .findAll({
    keyCondition: {
      partition: { status: 'pending' },
    },
    indexName: 'orders_by_status',
  })
  .exec();
```

If `indexName` is omitted, the repository automatically selects the best matching index based on the key condition attributes.

### Transactions

Group multiple write operations (create, update, upsert, delete) into an atomic transaction. All operations succeed or fail together:

```typescript
import { transaction } from '@lafken/dynamo/service';

await transaction([
  contactRepository.create({
    email: 'new@example.com',
    company: 'Acme',
    name: 'New Contact',
    age: 25,
  }),
  orderRepository.update({
    keyCondition: { customerId: 'cust-1', orderId: 'ord-1' },
    setValues: { status: 'confirmed' },
  }),
  contactRepository.delete({
    email: 'old@example.com',
    company: 'Acme',
  }),
]);
```

> [!NOTE]
> Transaction builders are passed without calling `.exec()` — the `transaction` function handles execution internally.

### Extending the Table

The `DynamoResolver` supports an `extends` function for applying advanced CDKTN configuration to the generated table resource:

```typescript
new DynamoResolver([
  {
    table: Contact,
    extends: ({ table, scope }) => {
      // Add alarms, policies, or any CDKTN construct
    },
  },
]);
```
