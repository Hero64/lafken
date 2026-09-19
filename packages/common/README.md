# @lafken/common

`@lafken/common` is the core utility package for the Lafken framework. It provides the decorator factory functions, metadata reflection utilities, and shared types that power every `@lafken/*` package. If a Lafken package defines a decorator or reads infrastructure metadata, it depends on `@lafken/common`.

## Installation

```bash
pnpm add @lafken/common
```

## Overview

Lafken uses TypeScript decorators to declare infrastructure. This package provides the factories that create those decorators and the utilities that read the metadata they produce:

| Factory                    | Level  | Purpose                                      |
| -------------------------- | ------ | -------------------------------------------- |
| `createResourceDecorator`  | Class  | Mark a class as a deployable resource         |
| `createLambdaDecorator`    | Method | Mark a method as a Lambda handler             |
| `createEventDecorator`     | Param  | Bind a method parameter to the Lambda event   |
| `createFieldDecorator`     | Prop   | Describe a typed field inside a payload class |
| `createPayloadDecorator`   | Class  | Define a named payload schema                |

## Decorator Factories

### `createResourceDecorator`

Creates a **class-level** decorator that marks a class as an infrastructure resource. The factory automatically captures the resource name, the file path and folder (used for Lambda bundling), and any custom metadata you define.

```typescript
import { createResourceDecorator } from '@lafken/common';

export const RESOURCE_TYPE = 'MY_SERVICE' as const;

export interface MyServiceProps {
  name?: string;
  retryCount?: number;
}

export const MyService = createResourceDecorator<MyServiceProps>({
  type: RESOURCE_TYPE,
  callerFileIndex: 5,                       // Stack-trace index to resolve caller file
  getMetadata: (props) => ({                // Optional — transform props before storing
    ...props,
    retryCount: props.retryCount ?? 3,
  }),
});
```

Usage:

```typescript
@MyService({ name: 'notifications', retryCount: 5 })
export class NotificationService { ... }
```

**Captured metadata** (`ResourceMetadata`):

| Field          | Description                              |
| -------------- | ---------------------------------------- |
| `type`         | Resolver identifier (`MY_SERVICE`)       |
| `name`         | Explicit name or the class name          |
| `foldername`   | Directory of the decorated file          |
| `filename`     | File name (without `.js` extension)      |
| `originalName` | Original class name (for asset naming)   |
| `minify`       | Whether to minify the bundle (`true`)    |

### `createLambdaDecorator`

Creates a **method-level** decorator that registers a method as a Lambda handler. It stores handler metadata and rewrites the method descriptor so the framework can inject arguments (`@Event`, `@Context`) at runtime.

```typescript
import { createLambdaDecorator } from '@lafken/common';
import type { LambdaMetadata } from '@lafken/common';

export interface PublishProps {
  name: string;
  lambda?: LambdaProps;
}

export interface PublishMetadata extends PublishProps {
  name: string;
}

export const Publish = (props: PublishProps) =>
  createLambdaDecorator<PublishProps, PublishMetadata>({
    getLambdaMetadata: (props, methodName) => ({
      ...props,
      name: methodName,
    }),
  })(props);
```

Usage:

```typescript
class NotificationService {
  @Publish({ name: 'send-email' })
  sendEmail(@Event() event: EmailPayload) {
    // handler logic
  }
}
```

**`LambdaProps`** — Optional Lambda-level configuration available through the `lambda` property:

| Property      | Type                | Description                                   |
| ------------- | ------------------- | --------------------------------------------- |
| `timeout`     | `number`            | Execution timeout in seconds                  |
| `memory`      | `number`            | Memory allocation in MB                       |
| `runtime`     | `24 \| 22`   | Node.js runtime version                       |
| `services`    | `Services[]`        | IAM service permissions                       |
| `env`         | `EnvironmentValue`  | Environment variables (static or dynamic)     |
| `tags`        | `Record<string, string>` | Resource tags                            |
| `enableTrace` | `boolean`           | Enable AWS X-Ray tracing                      |

### `createEventDecorator`

Creates a **parameter-level** decorator that binds a method parameter to the incoming Lambda event. It works with `createFieldDecorator` to map typed payload classes onto the raw event.

```typescript
import { createEventDecorator } from '@lafken/common';

export const Event = createEventDecorator({
  prefix: 'my-service',
  enableInLambdaInvocation: false,  // Only capture metadata during build
});
```

Usage:

```typescript
class NotificationService {
  @Publish({ name: 'send-email' })
  sendEmail(@Event(EmailPayload) event: EmailPayload) { ... }
}
```

### `Context`

A built-in parameter decorator that injects the Lambda execution context:

```typescript
import { Context } from '@lafken/common';

class MyService {
  @Handler()
  process(@Event(Input) event: Input, @Context() ctx: any) {
    console.log(ctx.functionName);
  }
}
```

### `createFieldDecorator`

Creates a **property-level** decorator that describes a typed field inside a payload class. The field metadata is collected by resolvers to build event schemas (e.g., Step Functions input/output, API request bodies).

Supported types: `String`, `Number`, `Boolean`, nested classes, and arrays.

```typescript
import { createFieldDecorator } from '@lafken/common';

export const Field = createFieldDecorator({
  prefix: 'my-service',
  getMetadata: () => ({}),
});
```

Usage:

```typescript
class Address {
  @Field()
  street: string;

  @Field()
  city: string;
}

class UserPayload {
  @Field({ name: 'user_name' })   // Rename the field in the schema
  name: string;

  @Field()
  age: number;

  @Field({ type: Address })        // Nested object
  address: Address;

  @Field({ type: [String] })       // Array of primitives
  tags: string[];
}
```

### `createPayloadDecorator`

Creates a **class-level** decorator that gives a payload class a name and optional metadata. This identity is used when resolvers reference the payload in generated infrastructure.

```typescript
import { createPayloadDecorator } from '@lafken/common';

export const Payload = createPayloadDecorator({
  prefix: 'my-service',
  createUniqueId: true,   // Append a counter if names collide
});
```

Usage:

```typescript
@Payload({ name: 'CreateUserInput' })
class CreateUserInput {
  @Field()
  email: string;
}
```

## Metadata Utilities

Resolvers use these functions to read the metadata produced by the decorators above.

### `getResourceMetadata`

Returns the `ResourceMetadata` stored on a class by `createResourceDecorator`:

```typescript
import { getResourceMetadata } from '@lafken/common';

const metadata = getResourceMetadata(NotificationService);
// { type: 'MY_SERVICE', name: 'notifications', foldername: '...', ... }
```

### `getResourceHandlerMetadata`

Returns an array of handler metadata stored by `createLambdaDecorator`:

```typescript
import { getResourceHandlerMetadata } from '@lafken/common';

const handlers = getResourceHandlerMetadata<PublishMetadata>(NotificationService);
// [{ name: 'sendEmail', ... }]
```

### `getMetadataByKey` / `getMetadataPrototypeByKey`

Low-level helpers to read any Reflect metadata by key from a class or its prototype:

```typescript
import { getMetadataByKey, getMetadataPrototypeByKey } from '@lafken/common';

const payload = getMetadataByKey<PayloadMetadata>(MyClass, 'my-service:lafken:payload');
const fields  = getMetadataPrototypeByKey<FieldMetadata[]>(MyClass, 'my-service:lafken:field');
```

## Build Environment

Decorators only capture metadata when the build environment flag is set. This prevents metadata side-effects during normal runtime execution.

- **`isBuildEnvironment()`** — Returns `true` when the `LAFKEN_CONTEXT` environment variable equals `BUILD`.
- **`enableBuildEnvVariable()`** — Sets the flag. **Required in tests** before declaring any decorated class.

```typescript
import { enableBuildEnvVariable } from '@lafken/common';

describe('My resolver', () => {
  enableBuildEnvVariable();

  @MyService({ name: 'test' })
  class TestResource { ... }

  it('should capture metadata', () => {
    const meta = getResourceMetadata(TestResource);
    expect(meta.name).toBe('test');
  });
});
```

## String Utilities

General-purpose string helpers used throughout the framework:

| Function               | Description                                          | Example                          |
| ---------------------- | ---------------------------------------------------- | -------------------------------- |
| `capitalize(str)`      | Uppercase first letter                               | `'hello'` → `'Hello'`           |
| `kebabCase(str)`       | Convert to kebab-case                                | `'MyService'` → `'my-service'`  |
| `cleanString(str)`     | Remove non-alphanumeric characters                   | `'a-b_c'` → `'abc'`            |
| `cleanAndCapitalize(str)` | Clean + capitalize each word                      | `'my-service'` → `'MyService'`  |
| `cleanTemplateString(str)` | Trim + collapse multiline strings into one line  | —                                |

## Shared Types

### Services & Permissions

The `Services` type provides typed IAM permission declarations for Lambda handlers:

```typescript
import type { Services } from '@lafken/common';

// Shorthand — grants full service access
const services: Services[] = ['dynamodb', 's3'];

// Fine-grained — specific actions and resources
const services: Services[] = [
  { type: 'dynamodb', permissions: ['GetItem', 'PutItem'] },
  { type: 's3', permissions: ['GetObject'], resources: ['arn:aws:s3:::my-bucket/*'] },
  { type: 'custom', serviceName: 'ses', permissions: ['SendEmail'] },
];
```

Supported service types: `dynamodb`, `s3`, `lambda`, `cloudwatch`, `sqs`, `state_machine`, `kms`, `ssm`, `event`, and `custom`.

### Environment Variables

```typescript
import { Refs } from '@lafken/common';
import type { EnvironmentValue } from '@lafken/common';

// Static values
const env: EnvironmentValue = { TABLE_NAME: 'users' };

// Dynamic values — resolved at deploy time via resource references
const env: EnvironmentValue = {
  TABLE_ARN: Refs.resourceValue('dynamo::users-table', 'arn'),
};
```

### Duration

```typescript
import type { Duration } from '@lafken/common';

const timeout: Duration = 30;                              // seconds
const ttl: Duration = { type: 'days', duration: 7 };       // 7 days
```

### Cross-Resource References

`@lafken/common` exposes a `Refs` namespace with a small set of members that resolve real infrastructure values — the ARN of another resource, an SSM parameter, the current account ID, a Terraform built-in function — and can be dropped directly as the value of any resource or lambda config property, at any depth (env vars, plain strings, arrays, nested objects). No callback, no injected `props` object — just call `Refs.xxx()` where you need the value.

```typescript
import { Refs } from '@lafken/common';

@Api({ path: '/users' })
export class UserApi {
  @Get({
    lambda: {
      env: {
        TABLE_ARN: Refs.resourceValue('dynamo::users-table', 'arn'),
        API_KEY: Refs.ssmValue('/my-app/api-key'),
        ACCOUNT_ID: Refs.accountId(),
        BUCKET_NAME: Refs.fn.upper('my-bucket'),
      },
    },
  })
  getUser() { /* ... */ }
}
```

| Member                                | Description                                                          |
| -------------------------------------- | --------------------------------------------------------------------- |
| `Refs.resourceValue(ref, attr)`   | References an attribute (e.g. `arn`, `id`) of another Lafken resource |
| `Refs.ssmValue(path, secure?)`    | References a value from AWS Systems Manager Parameter Store           |
| `Refs.accountId()`                | AWS account ID where the stack is deployed                            |
| `Refs.callerArn()`                | ARN of the caller credentials used during deployment                  |
| `Refs.region()`                   | AWS region where the stack is deployed                                |
| `Refs.partition()`                | AWS partition (`aws`, `aws-cn`, `aws-us-gov`)                          |
| `Refs.dnsSuffix()`                | Base DNS domain for the current partition (e.g. `amazonaws.com`)      |
| `Refs.fn`                         | Terraform built-in functions (backed by CDKTN's `Fn`)                 |
| `Refs.token`                      | Terraform token utilities (backed by CDKTN's `Token`)                 |

Every member is resolved lazily: the actual value is only computed once the whole app has been built and synthesized, regardless of the declaration order between the resources involved. Outside of build mode (e.g. inside the deployed Lambda handler itself, or a unit test that only exercises business logic), every member is a safe no-op that returns `undefined` without throwing — `@lafken/common` never imports `cdktn`, so calling them from Lambda runtime code has no cost.

`registerRefResolvers()` is the injection point `@lafken/resolver` uses to wire the real CDKTN-backed implementation into `Refs`; application code never calls it directly.

### Type-Safe Resource References

The package provides augmentable interfaces that enable type-safe resource names across modules. Packages extend these interfaces so that `Refs.resourceValue` calls are validated at compile time:

```typescript
// In your lafken-types.d.ts
declare module '@lafken/common' {
  // Resources defined in this application
  interface SharedResourceNames {
    dynamo: 'users-table';
    queue: 'email-queue';
  }

  // Resources from external stacks referenced by this application
  interface SharedReferenceResources {
    dynamo: 'shared-table';
  }
}
```

## API Reference

### Decorator Factories

| Export                     | Description                                |
| -------------------------- | ------------------------------------------ |
| `createResourceDecorator`  | Factory for class-level resource decorators |
| `createLambdaDecorator`    | Factory for method-level handler decorators |
| `createEventDecorator`     | Factory for parameter-level event binding   |
| `createFieldDecorator`     | Factory for property-level field metadata   |
| `createPayloadDecorator`   | Factory for class-level payload naming      |
| `Context`                  | Parameter decorator for Lambda context      |

### Metadata Readers

| Export                       | Description                                |
| ---------------------------- | ------------------------------------------ |
| `getResourceMetadata`        | Read class resource metadata               |
| `getResourceHandlerMetadata` | Read method handler metadata               |
| `getMetadataByKey`           | Read metadata by key from a class          |
| `getMetadataPrototypeByKey`  | Read metadata by key from a prototype      |

### Utilities

| Export                    | Description                              |
| ------------------------- | ---------------------------------------- |
| `enableBuildEnvVariable`  | Enable build mode for decorator capture  |
| `isBuildEnvironment`      | Check if build mode is active            |
| `getCallerFileName`       | Resolve the caller file from the stack   |
| `capitalize`              | Capitalize a string                      |
| `kebabCase`               | Convert to kebab-case                    |
| `cleanString`             | Strip non-alphanumeric characters        |
| `cleanAndCapitalize`      | Clean and capitalize each word           |
| `cleanTemplateString`     | Collapse multiline string to one line    |
| `Refs`               | Namespace of cross-resource reference members — see [Cross-Resource References](#cross-resource-references) |
| `registerRefResolvers`    | Injection point used by `@lafken/resolver` to back `Refs`  |

### Constants

| Export                 | Description                          |
| ---------------------- | ------------------------------------ |
| `LAFKEN_CONTEXT`       | Environment variable name            |
| `LAFKEN_CONTEXT_VALUE` | Expected value for build mode        |

### Key Types

| Export               | Description                                         |
| -------------------- | --------------------------------------------------- |
| `ResourceProps`      | Base props for resource decorators                   |
| `ResourceMetadata`   | Metadata shape stored by resource decorators         |
| `LambdaProps`        | Lambda configuration (timeout, memory, runtime, ...) |
| `LambdaMetadata`     | Metadata shape for handler methods                   |
| `FieldMetadata`      | Discriminated union of field types                   |
| `PayloadMetadata`    | Metadata shape for payload classes                   |
| `Services`           | IAM permission declaration type                      |
| `EnvironmentValue`   | Static or dynamic environment variables              |
| `Duration`           | Seconds or `{ type, duration }` object               |
| `ClassResource`      | Generic class constructor type                       |
| `TerraformFn`        | Type of the `fn` namespace                           |
| `TerraformToken`     | Type of the `token` namespace                        |
| `DeepPartial<T>`     | Recursive partial type utility                       |

## License

MIT
