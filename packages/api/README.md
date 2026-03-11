# @lafken/api

Build AWS REST APIs using TypeScript decorators. `@lafken/api` lets you declare endpoints, request/response models, authorizers, and AWS service integrations directly in your classes — Lafken generates all the API Gateway and Lambda infrastructure for you.

## Installation

```bash
npm install @lafken/api
```

## Getting Started

Register the `ApiResolver` in your application and define your first API resource:

```typescript
import { createApp, createModule } from '@lafken/main';
import { ApiResolver } from '@lafken/api/resolver';
import { Api, Get, Post, Event, ApiRequest, BodyParam } from '@lafken/api/main';

// 1. Define request payload
@ApiRequest()
class CreateTaskPayload {
  @BodyParam({ minLength: 1 })
  title: string;
}

// 2. Define the API resource
@Api({ path: '/tasks' })
class TaskApi {
  @Get()
  list() {
    return [{ id: 1, title: 'Review PR' }];
  }

  @Post()
  create(@Event(CreateTaskPayload) payload: CreateTaskPayload) {
    return { id: 2, title: payload.title };
  }
}

// 3. Register it in a module
const taskModule = createModule({
  name: 'tasks',
  resources: [TaskApi],
});

// 4. Add the resolver to your app
createApp({
  name: 'my-app',
  resolvers: [
    new ApiResolver({
      restApi: {
        name: 'my-rest-api',
        cors: { allowOrigins: true },
        stage: { stageName: 'dev' },
      },
    }),
  ],
  modules: [taskModule],
});
```

If no configuration is passed to `ApiResolver`, a default API Gateway is created with minimal settings. You can also create multiple APIs within the same application by passing multiple configuration objects.

## Features

### HTTP Methods

Use `@Get`, `@Post`, `@Put`, `@Patch`, `@Delete`, `@Head`, and `@Any` to define endpoints. Each decorator creates a Lambda-backed method on the API Gateway resource defined by `@Api`.

The method path is appended to the base path set in `@Api`:

```typescript
import { Api, Get, Post, Put, Delete } from '@lafken/api/main';

@Api({ path: '/articles' })
class ArticleApi {
  @Get()
  listAll() {
    return [{ id: 1, title: 'Getting Started' }];
  }

  @Get({ path: '{id}' })
  getById() {
    return { id: 1, title: 'Getting Started' };
  }

  @Post()
  create() {
    return { id: 2, title: 'New Article' };
  }

  @Put({ path: '{id}' })
  update() {
    return { updated: true };
  }

  @Delete({ path: '{id}' })
  remove() {
    return { deleted: true };
  }
}
```

### Request Events

Handler methods receive structured input through the `@Event` decorator combined with an `@ApiRequest` class. Field decorators specify where each value is extracted from in the HTTP request:

| Decorator        | Source                         | Always Required |
| ---------------- | ------------------------------ | --------------- |
| `@BodyParam`     | Request body                   | Yes (default)   |
| `@PathParam`     | URL path parameter             | Yes (always)    |
| `@QueryParam`    | Query string parameter         | Yes (default)   |
| `@HeaderParam`   | HTTP header                    | Yes (default)   |
| `@ContextParam`  | API Gateway request context    | Yes (always)    |

These decorators generate a fully resolved Velocity `requestTemplate` internally, mapping each field to the correct source.

```typescript
import { Api, Post, Event, ApiRequest, PathParam, BodyParam, QueryParam } from '@lafken/api/main';

@ApiRequest()
class CreateCommentPayload {
  @PathParam()
  articleId: number;

  @BodyParam({ minLength: 1, maxLength: 500 })
  content: string;

  @QueryParam({ required: false })
  notify: string;
}

@Api({ path: '/articles' })
class ArticleApi {
  @Post({ path: '{articleId}/comments' })
  addComment(@Event(CreateCommentPayload) payload: CreateCommentPayload) {
    return { articleId: payload.articleId, content: payload.content };
  }
}
```

#### Body Parameter Validation

`@BodyParam` supports type-specific validation constraints that map to OpenAPI schema attributes:

```typescript
@ApiRequest()
class SignupPayload {
  @BodyParam({ minLength: 3, maxLength: 50 })
  username: string;

  @BodyParam({ format: 'email' })
  email: string;

  @BodyParam({ min: 18, max: 120 })
  age: number;

  @BodyParam({ minItems: 1, uniqueItems: true })
  roles: string[];
}
```

#### Nested Request Objects

Use `@RequestObject` (an alias for `@ApiRequest`) to define nested structures within a request payload:

```typescript
import { ApiRequest, RequestObject, BodyParam } from '@lafken/api/main';

@RequestObject()
class Address {
  @BodyParam()
  street: string;

  @BodyParam()
  city: string;
}

@ApiRequest()
class CreateContactPayload {
  @BodyParam({ minLength: 1 })
  name: string;

  @BodyParam({ type: Address })
  address: Address;
}
```

#### Context Parameters

Access API Gateway context variables such as request IDs or client IPs using `@ContextParam`:

```typescript
@ApiRequest()
class AuditedPayload {
  @BodyParam()
  action: string;

  @ContextParam({ name: 'requestId' })
  requestId: string;

  @ContextParam({ name: 'identity.sourceIp' })
  clientIp: string;
}
```

### AWS Service Integrations

HTTP methods can integrate directly with AWS services without an intermediate Lambda function. Set the `integration` property on the method decorator and use `@IntegrationOptions` to reference other infrastructure resources via `getResourceValue`.

Supported integrations:

| Integration      | Actions                        |
| ---------------- | ------------------------------ |
| `bucket`         | `Download`, `Upload`, `Delete` |
| `dynamodb`       | `Query`, `Put`, `Delete`       |
| `queue`          | `SendMessage`                  |
| `state-machine`  | `Start`, `Stop`, `Status`      |

#### S3 Bucket Integration

```typescript
import {
  Api,
  Get,
  Put,
  IntegrationOptions,
  type BucketIntegrationOption,
  type BucketIntegrationResponse,
} from '@lafken/api/main';

@Api({ path: '/documents' })
class DocumentApi {
  @Get({
    integration: 'bucket',
    action: 'Download',
  })
  download(
    @IntegrationOptions() { getResourceValue }: BucketIntegrationOption,
  ): BucketIntegrationResponse {
    return {
      bucket: getResourceValue('project-documents', 'id'),
      object: 'report.pdf',
    };
  }

  @Put({
    integration: 'bucket',
    action: 'Upload',
  })
  upload(
    @IntegrationOptions() { getResourceValue }: BucketIntegrationOption,
  ): BucketIntegrationResponse {
    return {
      bucket: getResourceValue('project-documents', 'id'),
      object: 'new-report.pdf',
    };
  }
}
```

#### DynamoDB Integration

```typescript
import {
  Api,
  Get,
  Post,
  IntegrationOptions,
  type DynamoIntegrationOption,
  type DynamoQueryIntegrationResponse,
  type DynamoPutIntegrationResponse,
} from '@lafken/api/main';

@Api({ path: '/products' })
class ProductApi {
  @Get({
    integration: 'dynamodb',
    action: 'Query',
  })
  search(
    @IntegrationOptions() { getResourceValue }: DynamoIntegrationOption,
  ): DynamoQueryIntegrationResponse {
    return {
      tableName: getResourceValue('products-table', 'id'),
      partitionKey: { category: 'electronics' },
    };
  }

  @Post({
    integration: 'dynamodb',
    action: 'Put',
  })
  add(
    @IntegrationOptions() { getResourceValue }: DynamoIntegrationOption,
  ): DynamoPutIntegrationResponse {
    return {
      tableName: getResourceValue('products-table', 'id'),
      data: { name: 'Keyboard', price: 75 },
    };
  }
}
```

#### SQS Queue Integration

```typescript
import {
  Api,
  Post,
  IntegrationOptions,
  type QueueIntegrationOption,
  type QueueSendMessageIntegrationResponse,
} from '@lafken/api/main';

@Api({ path: '/notifications' })
class NotificationApi {
  @Post({
    integration: 'queue',
    action: 'SendMessage',
  })
  enqueue(
    @IntegrationOptions() { getResourceValue }: QueueIntegrationOption,
  ): QueueSendMessageIntegrationResponse {
    return {
      queueName: getResourceValue('notification-queue', 'id'),
      body: { type: 'welcome', recipient: 'new-user' },
    };
  }
}
```

#### State Machine Integration

```typescript
import {
  Api,
  Post,
  Get,
  IntegrationOptions,
  type StateMachineIntegrationOption,
  type StateMachineStartIntegrationResponse,
  type StateMachineStatusIntegrationResponse,
} from '@lafken/api/main';

@Api({ path: '/workflows' })
class WorkflowApi {
  @Post({
    integration: 'state-machine',
    action: 'Start',
  })
  start(
    @IntegrationOptions() { getResourceValue }: StateMachineIntegrationOption,
  ): StateMachineStartIntegrationResponse {
    return {
      stateMachineArn: getResourceValue('processing-workflow', 'arn'),
      input: { step: 'begin' },
    };
  }

  @Get({
    integration: 'state-machine',
    action: 'Status',
  })
  status(
    @IntegrationOptions() { getResourceValue }: StateMachineIntegrationOption,
  ): StateMachineStatusIntegrationResponse {
    return {
      executionArn: getResourceValue('processing-workflow', 'arn'),
    };
  }
}
```

### Responses

You can return values directly from handler methods without defining a response type. However, for more control over status codes and response models, use the `@ApiResponse` and `@ResField` decorators.

#### Basic Response Model

Define a response class and pass it to the method decorator via the `response` property:

```typescript
import { Api, Get, ApiResponse, ResField } from '@lafken/api/main';

@ApiResponse()
class ArticleResponse {
  @ResField()
  title: string;

  @ResField()
  views: number;
}

@Api({ path: '/articles' })
class ArticleApi {
  @Get({ path: '{id}', response: ArticleResponse })
  getById(): ArticleResponse {
    return { title: 'Getting Started', views: 42 };
  }
}
```

#### Multiple Status Codes

Map different HTTP status codes to distinct response classes. Use `true` for responses without a body:

```typescript
import { Api, Post, ApiResponse, ResField, response } from '@lafken/api/main';

@ApiResponse()
class ErrorResponse {
  @ResField()
  message: string;
}

@ApiResponse({
  responses: {
    400: ErrorResponse,
    204: true,
  },
})
class CreateArticleResponse {
  @ResField()
  id: number;

  @ResField()
  title: string;
}

@Api({ path: '/articles' })
class ArticleApi {
  @Post({ response: CreateArticleResponse })
  create(): CreateArticleResponse {
    const isInvalid = false;

    if (isInvalid) {
      response<ErrorResponse>(400, { message: 'Title is required' });
    }

    return { id: 1, title: 'New Article' };
  }
}
```

The `response()` function returns a response with a specific status code that API Gateway interprets correctly.

#### Default Status Codes

If no `response` property is set, default status codes are generated automatically (`20X` for success, `400` and `500` for errors). The default success code depends on the HTTP method:

- `POST` defaults to `201`
- All other methods default to `200`

Override the default code with `defaultCode`:

```typescript
@ApiResponse({
  defaultCode: 202,
})
class AsyncResponse {
  @ResField()
  jobId: string;
}
```

#### Nested Response Objects

Use `@ResponseObject` to define nested structures within a response:

```typescript
import { ApiResponse, ResponseObject, ResField } from '@lafken/api/main';

@ResponseObject()
class AuthorInfo {
  @ResField()
  name: string;

  @ResField()
  email: string;
}

@ApiResponse()
class ArticleDetailResponse {
  @ResField()
  title: string;

  @ResField({ type: AuthorInfo })
  author: AuthorInfo;
}
```

### Authorizers

Lafken supports three authorization strategies: **API Key**, **Custom Lambda**, and **Cognito**. Each is defined as a decorated class and registered in the `ApiResolver`.

#### API Key Authorizer

Protects endpoints by requiring a valid API key. Optionally configure quota limits and throttling:

```typescript
import { ApiKeyAuthorizer } from '@lafken/api/main';

@ApiKeyAuthorizer({
  name: 'platform-api-key',
  defaultKeys: ['default-key'],
  quota: { limit: 10000, period: 'month' },
  throttle: { burstLimit: 50, rateLimit: 100 },
})
export class PlatformApiKey {}
```

#### Custom Authorizer

Implement your own authentication logic with a Lambda-backed authorizer. The class must include a method decorated with `@AuthorizerHandler`:

```typescript
import {
  CustomAuthorizer,
  AuthorizerHandler,
  type AuthorizationHandlerEvent,
  type AuthorizerResponse,
} from '@lafken/api/main';

@CustomAuthorizer({
  name: 'token-auth',
  header: 'Authorization',
  authorizerResultTtlInSeconds: 300,
})
export class TokenAuthorizer {
  @AuthorizerHandler()
  validate(event: AuthorizationHandlerEvent): AuthorizerResponse {
    const isValid = event.headers?.Authorization === 'Bearer valid-token';

    return {
      principalId: 'user@example.com',
      allow: isValid,
    };
  }
}
```

The handler receives an `AuthorizationHandlerEvent` — the standard `APIGatewayRequestAuthorizerEvent` enriched with a `permissions` array containing the scopes configured for the invoked method. It must return an `AuthorizerResponse` with `allow` and `principalId`.

#### Cognito Authorizer

Integrates with an Amazon Cognito User Pool for token-based authorization. Requires `@lafken/auth` to be configured first:

```typescript
import { CognitoAuthorizer } from '@lafken/api/main';

@CognitoAuthorizer({
  userPool: 'main-user-pool',
  name: 'cognito-auth',
  header: 'Authorization',
  authorizerResultTtlInSeconds: 300,
})
export class MainCognitoAuth {}
```

#### Registering Authorizers

Pass authorizer classes to the `ApiResolver` and optionally set a default authorizer for all methods:

```typescript
new ApiResolver({
  restApi: {
    name: 'my-rest-api',
    auth: {
      authorizers: [PlatformApiKey, TokenAuthorizer],
      defaultAuthorizerName: 'token-auth',
    },
  },
});
```

#### Applying Authorizers

The `auth` property is available on both `@Api` (class-level) and method decorators (`@Get`, `@Post`, etc.). Method-level settings override class-level ones.

Apply to all methods in a class:

```typescript
@Api({
  path: '/admin',
  auth: { authorizerName: 'platform-api-key' },
})
class AdminApi { /* ... */ }
```

Apply to a specific method:

```typescript
@Get({
  path: '{id}',
  auth: { authorizerName: 'token-auth' },
})
getById() { /* ... */ }
```

Disable authorization for a specific method or entire class:

```typescript
@Get({ auth: false })
healthCheck() {
  return { status: 'ok' };
}
```

#### Scopes

Both Custom and Cognito authorizers support scopes — an array of strings delivered to the authorizer handler via the `permissions` property:

```typescript
@Delete({
  path: '{id}',
  auth: {
    authorizerName: 'token-auth',
    scopes: ['article:delete'],
  },
})
remove() { /* ... */ }
```

### Extending the API

The `ApiResolver` accepts an `extend` function that receives the generated API instance and the app scope. Use it to apply advanced CDKTN configuration such as custom domains or additional settings:

```typescript
new ApiResolver({
  restApi: {
    name: 'my-rest-api',
  },
  extend: ({ api, scope }) => {
    // Add a custom domain, WAF, or any CDKTN construct
  },
});
```
