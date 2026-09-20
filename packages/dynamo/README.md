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

### External Tables

Set `isExternal: true` to reference an existing DynamoDB table instead of creating one. The framework only reads the table by `name` — it does not manage its schema, indexes, or lifecycle:

```typescript
@Table({ name: 'legacy-contacts', isExternal: true })
export class LegacyContact {
  @PartitionKey(String)
  id: PrimaryPartition<string>;
}
```

Register it the same way as any other table — `new DynamoResolver([LegacyContact])`. `stream`, `replica`, and `outputs` don't apply to external tables, since the framework doesn't own the resource.

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

With `billingMode: 'provisioned'`, every **global** secondary index must also declare its own `readCapacity`/`writeCapacity` — local indexes share the table's capacity and don't need it:

```typescript
@Table({
  name: 'orders',
  billingMode: 'provisioned',
  readCapacity: 100,
  writeCapacity: 50,
  indexes: [
    {
      type: 'global',
      name: 'orders_by_status',
      partitionKey: 'status',
      readCapacity: 20,
      writeCapacity: 10,
    },
  ],
})
export class Order { ... }
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

### Outputs

Export table attributes to SSM Parameter Store or as Terraform outputs via `outputs`:

```typescript
@Table({
  name: 'contacts',
  outputs: [
    { type: 'ssm', name: '/contacts/arn', value: 'arn' },
    { type: 'output', name: 'contacts_stream_arn', value: 'streamArn' },
  ],
})
export class Contact { ... }
```

| Attribute     | Description                                                        |
| ------------- | -------------------------------------------------------------------- |
| `arn`         | ARN of the table                                                    |
| `id`          | Name of the table                                                   |
| `streamArn`   | ARN of the table stream — only available when `stream` is enabled   |
| `streamLabel` | Timestamp of the table stream — only available when `stream` is enabled |

### Global References

Set `ref` to register the table under a name, so other resources can read its attributes (e.g. an ARN dropped into a Lambda's `env`) without importing the table class directly:

```typescript
@Table({ name: 'contacts', ref: 'contacts' })
export class Contact { ... }
```

```typescript
import { Refs } from '@lafken/common';

lambda: {
  env: {
    CONTACTS_TABLE_ARN: Refs.resourceValue('dynamo::contacts', 'arn'),
  },
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

`findAll`/`findOne`/`scan` accept a second `cacheTtl` argument (seconds) to cache the result in memory, keyed by table name and query — see [Caching](#caching).

##### Filter Operators

Beyond a plain equality value, `filter` accepts one operator per field:

| Operator            | Description                                  |
| -------------------- | --------------------------------------------- |
| `lessThan`           | Value is less than                            |
| `lessOrEqualThan`    | Value is less than or equal to                |
| `greaterThan`        | Value is greater than                         |
| `greaterOrEqualThan` | Value is greater than or equal to             |
| `between`            | Value is between `[min, max]`                 |
| `in`                 | Value is one of a list                        |
| `beginsWith`         | String starts with (string fields only)       |
| `contains`           | String/array contains a value                 |
| `notContains`        | String/array does not contain a value         |
| `notEqual`           | Value is not equal to                         |
| `exist`              | Attribute exists                              |
| `notExist`           | Attribute does not exist                      |

```typescript
filter: {
  age: { between: [18, 65] },
  email: { beginsWith: 'jane' },
  archivedAt: { notExist: true },
}
```

Combine conditions across fields with `OR`/`AND`:

```typescript
filter: {
  OR: [{ age: { lessThan: 18 } }, { age: { greaterThan: 65 } }],
}
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

#### Get Item

Fetch a single item by its exact primary key using `GetItemCommand`. Unlike `findOne` (which runs a `QueryCommand` and supports partial/operator-based key conditions), `getItem` requires the full primary key and is the more efficient option for exact-key lookups:

```typescript
const item = await contactRepository
  .getItem(
    { email: 'jane@example.com', company: 'Acme' },
    { consistentRead: true, projection: ['name', 'age'] }
  )
  .exec();
```

| Option          | Type      | Description                                      |
| ---------------- | --------- | ------------------------------------------------- |
| `consistentRead` | `boolean` | Perform a strongly consistent read                 |
| `projection`     | `string[] \| 'ALL'` | Attributes to return                    |
| `cacheTtl`       | `number`  | Cache the result in memory for this many seconds — see [Caching](#caching) |

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

#### Batch Get

Fetch multiple items by their primary keys in one call using `BatchGetItemCommand`:

```typescript
const contacts = await contactRepository
  .batchGet([
    { email: 'a@example.com', company: 'X' },
    { email: 'b@example.com', company: 'Y' },
  ])
  .exec();
```

Keys are automatically split into batches of up to 100 (the DynamoDB limit) and sent in parallel; any `UnprocessedKeys` DynamoDB returns are automatically retried, up to `maxAttempt` times.

| Option           | Type                  | Default | Description                          |
| ----------------- | --------------------- | ------- | -------------------------------------- |
| `consistentRead`  | `boolean`              | `false` | Perform a strongly consistent read     |
| `projection`      | `string[] \| 'ALL'`    | —       | Attributes to return                   |
| `maxAttempt`      | `number`               | `5`     | Retries for unprocessed keys           |

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

#### Custom Client

By default every repository shares a `DynamoDBClient` built from the ambient AWS SDK configuration (the region, credentials and endpoint the SDK resolves from the environment). Pass a `client` to reach a table on a different region, account or endpoint, such as a local DynamoDB instance during development:

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { createRepository } from '@lafken/dynamo/service';

const client = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'us-east-1',
});

export const contactRepository = createRepository(Contact, { client });
```

Reuse the same instance across your models instead of creating one per repository, so they share a single connection pool.

#### Caching

Pass `cacheTtl` (seconds) to `findOne`, `findAll`, or `getItem` to store the result in an in-memory cache shared by that repository, keyed by table name and query:

```typescript
// Cached for 60 seconds
const item = await contactRepository
  .findOne({ keyCondition: { partition: { email: 'jane@example.com' } } }, 60)
  .exec();
```

Call `clearCache()` to invalidate every cached entry for the repository — useful right after a write that may have left stale data behind:

```typescript
await contactRepository.create({ ... }).exec();
contactRepository.clearCache();
```

The cache is in-memory only (per Lambda instance/process) and is never used by `scan`, `batchGet`, or transactional reads.

#### Send Raw Command

Escape hatch for SDK commands not covered by the repository methods. Runs against the same client the repository uses:

```typescript
import { QueryCommand } from '@aws-sdk/client-dynamodb';

const response = await contactRepository.sendRawCommand(
  new QueryCommand({ TableName: 'contacts', /* ... */ })
);
```

### Transactions

`transactionWrite` groups multiple write operations (create, update, upsert, delete) into an atomic transaction. All operations succeed or fail together:

```typescript
import { transactionWrite } from '@lafken/dynamo/service';

await transactionWrite([
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
> Transaction builders are passed without calling `.exec()` — the `transactionWrite` function handles execution internally.

The transaction is sent with the client of the repositories that created the builders, so every repository taking part in it must share the same client instance. A transaction is a single request and cannot be split across connections: mixing clients throws before anything is sent.

#### Transactional Reads

`transactionGet` reads several items atomically, from any number of tables, so all of them come from the same consistent snapshot. It accepts **only [`getItem`](#get-item) queries** — any other builder throws — and resolves the items in the same order they were requested, typed by position:

```typescript
import { transactionGet } from '@lafken/dynamo/service';

const [contact, order] = await transactionGet([
  contactRepository.getItem({ email: 'jane@example.com', company: 'Acme' }),
  orderRepository.getItem({ customerId: 'cust-1', orderId: 'ord-1' }),
]);
```

`contact` is `Contact | undefined` and `order` is `Order | undefined`: an item that does not exist resolves as `undefined` in its position.

Unlike [`batchGet`](#batch-get), which splits its keys into several requests over a single table, this is one request and cannot be chunked — DynamoDB limits it to 100 items.

> [!NOTE]
> `consistentRead` and `cacheTtl` do not apply to the queries of a read transaction: it is already strongly consistent, and the in-memory cache is never read nor populated.

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
