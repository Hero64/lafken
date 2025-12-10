# @lafken/dynamo

This package simplifies the creation and management of DynamoDB tables. It provides decorators that allow you to define the table’s configuration declaratively, as well as to enable a direct service that can be consumed within Lambda functions for performing DynamoDB operations.


## Installation

```bash
npm install @lafken/dynamo
```

## Configuration

To get started, you must add the DynamoResolver to your application. Import the resolver and instantiate it, passing the classes that will define the DynamoDB tables. Each class must be decorated with the @Model decorator, which receives the configuration applied to the table, along with the properties that compose the data model.

```typescript
import { ApiResolver } from '@lafken/bucket/resolver';

//...
@Model({
  name: 'clients',
  indexes: [
    {
      type: 'local',
      name: 'email_age_index',
      sortKey: 'age',
    },
  ],
  ttl: 'expireAt',
})
export class Client {
  @PartitionKey(String)
  email: PrimaryPartition<string>;

  @SortKey(String)
  name: PrimaryPartition<string>;

  @Field()
  age: number;

  @Field()
  expireAt: number;
}

// ...
createApp({
  name: 'awesome-app',
  resolvers: [
    new DynamoResolver([Client]),
  ],
  ...
});
```

## Features

### Table
You can create a DynamoDB table by defining a class and decorating it with the @Model decorator. This decorator provides all the necessary configuration for generating the table, including keys, indexes, TTL settings, and optional stream definitions.

```typescript
@Model({
  name: 'clients',
})
class Client {
  @PartitionKey(String)
  email: PrimaryPartition<string>;
}
```

### Stream
You can enable a data stream directly on the table and apply event-level filters. When enabled, the table stream is automatically connected to an EventBridge event using EventBridge Pipes. This allows changes in the table to be forwarded as structured events without additional configuration.

To consume and process these events, use the @alicanto/event package, which provides decorators for defining EventBridge listeners and handling DynamoDB stream payloads.

```typescript
@Model({
  name: 'clients',
  ttl: 'expireAt',
  stream: {
    enabled: true,
    type: 'NEW_IMAGE',
    filters: {
      keys: {
        email: [{ suffix: 'lafken.com' }],
      },
      newImage: {
        name: ['foo'],
      },
    },
  },
})
export class Client {
  // ...
}
```
### Repository
Once a bucket is defined, you can create a repository for it. A repository provides direct access to common S3 SDK operations such as uploading, moving, or deleting objects.

```typescript
export const clientRepository = createRepository(Client);
// ...
await clientRepository
  .create({
    name: 'lafken',
    age: 1,
    email: 'awesome@lafken.com',
    expireAt: 1000000000,
  })
  .exec();
// ...
await clientRepository.findAll({
  keyCondition: {
    partition: {
      email: 'awesome@lafken.com'
    }
  }
}).exec();
```

### Transactions
The repository also supports executing DynamoDB transactions, allowing you to perform multiple write operations atomically.
Using the transaction helper, you can group several repository actions—such as create, update, or delete—and ensure that all of them succeed or fail as a single unit.

```typescript
await transaction([
  clientRepository.create({
    name: 'lafken',
    age: 1,
    email: 'awesome@lafken.com',
    expireAt: 1000000000,
  }),
  documentRepository.create({
    // ...
  }),
]);
```
