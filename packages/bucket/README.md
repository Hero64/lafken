# @lafken/bucket

Define and manage Amazon S3 buckets using TypeScript decorators. `@lafken/bucket` lets you declare bucket configuration — versioning, ACL, lifecycle rules, transfer acceleration, and EventBridge integration — directly on a class. A built-in repository provides type-safe S3 operations at runtime.

## Installation

```bash
npm install @lafken/bucket
```

## Getting Started

Define a bucket class with `@Bucket`, register it in the `BucketResolver`, and use `createRepository` to interact with it:

```typescript
import { createApp } from '@lafken/main';
import { BucketResolver } from '@lafken/bucket/resolver';
import { Bucket } from '@lafken/bucket/main';
import { createRepository } from '@lafken/bucket/service';

// 1. Define the bucket
@Bucket({ name: 'project-assets', versioned: true })
export class AssetsBucket {}

// 2. Create a repository for runtime operations
export const assetsRepository = createRepository(AssetsBucket);

// 3. Register the bucket in the resolver
createApp({
  name: 'my-app',
  resolvers: [new BucketResolver([AssetsBucket])],
});
```

## Features

### Defining a Bucket

Use the `@Bucket` decorator on a class to declare an S3 bucket. If `name` is omitted, the class name is used:

```typescript
import { Bucket } from '@lafken/bucket/main';

@Bucket({
  name: 'upload-storage',
  versioned: true,
  acl: 'private',
  forceDestroy: true,
  tags: { environment: 'production' },
})
export class UploadBucket {}
```

#### Bucket Options

| Option                | Type                                          | Default      | Description                                               |
| --------------------- | --------------------------------------------- | ------------ | --------------------------------------------------------- |
| `name`                | `string`                                      | class name   | S3 bucket name                                            |
| `versioned`           | `boolean`                                     | `false`      | Enable object versioning                                  |
| `acl`                 | `'private' \| 'public-read' \| 'public-read-write'` | —     | Access control list                                       |
| `forceDestroy`        | `boolean`                                     | `false`      | Delete all objects when the bucket is destroyed            |
| `eventBridgeEnabled`  | `boolean`                                     | `false`      | Send bucket events to Amazon EventBridge                  |
| `transferAcceleration`| `boolean`                                     | `false`      | Enable CloudFront-based transfer acceleration             |
| `tracing`             | `boolean`                                     | `false`      | Enable AWS X-Ray tracing on repository operations         |
| `tags`                | `Record<string, string>`                      | —            | Tags applied to the bucket resource                       |
| `lifeCycleRules`      | `Record<string, KeyLifeCycleRule>`            | —            | Object lifecycle management rules                         |

### Lifecycle Rules

Define rules to automatically transition or expire objects based on age and size. Each key in `lifeCycleRules` represents an object prefix filter:

```typescript
@Bucket({
  name: 'log-archive',
  lifeCycleRules: {
    'logs/': {
      condition: {
        objectSizeGreaterThan: 1024,
      },
      expiration: {
        days: 90,
      },
      transitions: [
        { days: 30, storage: 'standard_ia' },
        { days: 60, storage: 'glacier' },
      ],
    },
    'tmp/': {
      expiration: {
        days: 7,
      },
    },
  },
})
export class LogBucket {}
```

#### Expiration Options

| Option                       | Type      | Description                                       |
| ---------------------------- | --------- | ------------------------------------------------- |
| `days`                       | `number`  | Delete objects after this many days                |
| `date`                       | `Date`    | Delete objects after a specific date               |
| `expiredObjectDeleteMarker`  | `boolean` | Remove expired object delete markers               |

> [!NOTE]
> Only one expiration option can be set per rule.

#### Condition Options

| Option                   | Type     | Description                                   |
| ------------------------ | -------- | --------------------------------------------- |
| `objectSizeGreaterThan`  | `number` | Apply rule only to objects larger than (bytes) |
| `objectSizeLessThan`     | `number` | Apply rule only to objects smaller than (bytes)|

#### Available Storage Classes

| Storage Class          | Description                                      |
| ---------------------- | ------------------------------------------------ |
| `standard_ia`          | Infrequent access, lower cost                    |
| `onezone_ia`           | Single-AZ infrequent access                      |
| `intelligent_tiering`  | Automatic cost optimization by access patterns   |
| `glacier`              | Long-term archive (minutes to hours retrieval)   |
| `glacier_ir`           | Instant retrieval archive                        |
| `deep_archive`         | Lowest cost (12+ hours retrieval)                |

### EventBridge Integration

Enable `eventBridgeEnabled` to send bucket events (object created, deleted, etc.) to Amazon EventBridge. Combine with `@lafken/event` to process these events:

```typescript
@Bucket({
  name: 'document-uploads',
  eventBridgeEnabled: true,
})
export class DocumentBucket {}
```

### Repository

`createRepository` provides a type-safe API for S3 operations at runtime. The bucket name is automatically injected into every command:

```typescript
import { createRepository } from '@lafken/bucket/service';

export const docsRepository = createRepository(DocumentBucket);
```

#### Put Object

Upload an object to the bucket:

```typescript
await docsRepository.putObject({
  Key: 'reports/monthly.json',
  Body: JSON.stringify({ revenue: 50000 }),
  ContentType: 'application/json',
});
```

#### Get Object

Retrieve an object from the bucket:

```typescript
const response = await docsRepository.getObject({
  Key: 'reports/monthly.json',
});

const body = await response.Body?.transformToString();
```

#### Delete Object

Remove an object from the bucket:

```typescript
await docsRepository.deleteObject({
  Key: 'reports/old-report.json',
});
```

#### Copy Object

Copy an object within or across buckets:

```typescript
await docsRepository.copyObject({
  Key: 'archive/monthly.json',
  CopySource: 'document-uploads/reports/monthly.json',
});
```

#### Move Object

Copy an object to a new key and delete the original in a single operation:

```typescript
await docsRepository.moveObject({
  Key: 'processed/monthly.json',
  CopySource: 'document-uploads/reports/monthly.json',
});
```

#### List Objects

List all objects matching a prefix. Pagination is handled automatically:

```typescript
const result = await docsRepository.listObjects({
  Prefix: 'reports/',
});

for (const object of result.Contents) {
  console.log(object.Key, object.Size);
}
```

### X-Ray Tracing

Enable `tracing` in the `@Bucket` decorator to instrument all repository operations with AWS X-Ray:

```typescript
@Bucket({
  name: 'traced-bucket',
  tracing: true,
})
export class TracedBucket {}
```

### Global Configuration

The `BucketResolver` accepts a second argument with global defaults applied to all buckets. Per-bucket options override global ones:

```typescript
new BucketResolver(
  [AssetsBucket, LogBucket],
  {
    forceDestroy: true,
    versioned: true,
    tags: { team: 'platform' },
  }
);
```

### Extending Buckets

Apply advanced CDKTN configuration to a bucket using the `extends` callback:

```typescript
new BucketResolver([
  {
    bucket: AssetsBucket,
    extends: ({ bucket, scope }) => {
      // Add CORS rules, policies, or any CDKTN construct
    },
  },
]);
```
