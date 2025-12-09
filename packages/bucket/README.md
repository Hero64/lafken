# @lafken/bucket

`@lafken/bucket` helps you create and manage Amazon S3 buckets directly in your infrastructure. It provides decorators that automatically generate the required bucket resources, and also exposes a repository that can be used within your Lambda functions to perform S3 operations through the AWS SDK.


## Installation

```bash
npm install @lafken/bucket
```

## Configuration

To get started, you must add the resolver when creating your application. Import the BucketResolver and instantiate it, passing the bucket classes that are decorated with the @Bucket decorator. These decorated classes define the S3 buckets that will be created as part of your infrastructure.

```typescript
import { ApiResolver } from '@lafken/bucket/resolver';

//...
@Bucket({
  name: 'lafken-example-documents',
  forceDestroy: true,
  eventBridgeEnabled: true,
})
export class DocumentBucket {}

// ...

createApp({
  name: 'awesome-app',
  resolvers: [
    new BucketResolver([DocumentBucket]),
  ],
  ...
});
```

## Features

### Bucket
You can define and configure an S3 bucket by creating a class and decorating it with the @Bucket decorator. This decorator allows you to specify all the necessary properties required to provision the bucket in Amazon S3.

```typescript
@Bucket({
  name: 'lafken-example-documents',
  forceDestroy: true,
  eventBridgeEnabled: true,
  versioned: true,
  tracing: true,
  transferAcceleration: true,
  acl: 'public-read-write',
  lifeCycleRules: {
    docs: {
      condition: {
        objectSizeGreaterThan: 1000,
      },
      expiration: {
        days: 20,
      },
      transitions: [
        {
          days: 10,
          storage: 'glacier',
        },
      ],
    },
  },
})
export class DocumentBucket {}
```
### Life cycle
Buckets support the creation of lifecycle rules through the lifeCycleRules property. These rules define how objects within the bucket are transitioned or expired over time. You can configure actions such as moving objects to different storage classes, archiving them, or deleting them after a specified period.
```typescript
@Bucket({
  lifeCycleRules: {
    docs: {
      condition: {
        objectSizeGreaterThan: 1000,
      },
      expiration: {
        days: 100,
      },
      transitions: [
        {
          days: 10,
          storage: 'intelligent_tiering',
        },
        {
          days: 30,
          storage: 'glacier'
        }
      ],
    },
  },
  // ...
})
// ...
```
### Repository
Once a bucket is defined, you can create a repository for it. A repository provides direct access to common S3 SDK operations such as uploading, moving, or deleting objects.

```typescript
import { Bucket } from '@lafken/bucket/main';
import { createRepository } from '@lafken/bucket/service';
//...
export class DocumentBucket {}
export const documentRepository = createRepository(DocumentBucket);

// ... in lambda 

await documentRepository.putObject({
  Key: 'list.json',
  Body: JSON.stringify([1, 2, 3]),
});
```
