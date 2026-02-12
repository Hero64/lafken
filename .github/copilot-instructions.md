# Lafken Codebase Instructions for AI Agents

## Architecture Overview

**Lafken** is a serverless framework built on CDKTF that defines AWS infrastructure using TypeScript decorators. The architecture follows a **Resolver Pattern** where:

1. **Decorators** mark classes/methods as infrastructure resources (e.g., `@Api`, `@Queue`, `@StateMachine`)
2. **Resolvers** process decorated resources and generate CDKTF constructs (e.g., `ApiResolver`, `QueueResolver`)
3. **Modules** organize resources into logical units with shared configuration
4. **Apps** orchestrate modules and resolvers into complete serverless applications

**Key Flow**: `@Decorator` → `Resource Class` → `Module` → `createApp()` → `Resolver` → CDKTF Infrastructure

## Monorepo Structure

This is a **pnpm + Turbo monorepo** with packages organized by AWS service:

- `packages/main` - Application entry point (`createApp`, `createModule`)
- `packages/resolver` - Base resolver interface, Lambda utilities, IAM roles, resource tracking
- `packages/api` - REST API resolver and decorators (`@Api`, `@Get`, `@Post`)
- `packages/queue`, `packages/event`, `packages/schedule`, `packages/state-machine`, `packages/bucket`, `packages/dynamo` - Service-specific resolvers
- `packages/common` - Decorator factories, metadata reflection, shared types
- `apps/example` - Example application using CDKTF

**Building**: `pnpm build` or `pnpm dev` (watch mode). **Testing**: `pnpm test` (runs with Turbo, max 2 concurrent packages).

## Critical Patterns & Conventions

### 1. Decorator-Based Resource Definition
Resources are declared using decorators that capture metadata via TypeScript reflection:

```typescript
@Api({ path: '/users' })
export class UserApi {
  @Get({ path: '{id}' })
  getUser() { return { id: 123 }; }
}
```

Decorators are created using `createResourceDecorator()` and `createLambdaDecorator()` from `@lafken/common`. The decorator factories populate metadata like:
- `type` - Resolver identifier (matched against registered resolvers)
- `filename`, `foldername` - For Lambda bundling
- `originalName` - Original class name for asset generation

### 2. Resolver Pattern
Each service type has a resolver implementing `ResolverType` with three lifecycle hooks:

```typescript
class ApiResolver implements ResolverType {
  async beforeCreate(scope: AppStack) { /* Create shared resources */ }
  async create(module: AppModule, resource: ClassResource) { /* Process resource */ }
  async afterCreate(scope: AppStack) { /* Configure integrations */ }
}
```

**Key point**: Resolvers use metadata (via `getResourceMetadata()`, `getResourceHandlerMetadata()`) to inspect decorated classes and generate infrastructure.

### 3. Factory Pattern for Complex Construction
Complex resolvers use factories to build infrastructure incrementally:

- [RestApi](packages/api/src/resolver/rest-api/rest-api.ts) → ResourceFactory → MethodFactory → IntegrationFactory (Lambda, etc.)
- Each factory manages a specific part of the resource tree

### 4. Global Resource Tracking & References
Resources can register globally using `isGlobal(module, id)` and reference each other:

```typescript
getResourceValue('module::resourceId', 'arn') // Retrieves registered resources
```

This is implemented via `lafkenResource.make()` which wraps CDKTF Constructs and enables global registration via `isDependent()` callbacks.

### 5. Environment Variables & Context
Lambda environment variables support:
- **Static values**: `{ FOO: 'bar' }`
- **Dynamic values**: `getResourceValue()` callbacks to reference other resources
- **SSM Parameter Store**: `'SSM::STRING::/path/to/param'` notation

Context is managed per-app and per-module via `AppContext` with global config for memory, timeout, runtime, services.

### 6. Build Environment Flag
**Critical for testing**: Decorators only work during builds. Tests must enable build mode:

```typescript
import { enableBuildEnvVariable } from '@lafken/common';

describe('...', () => {
  enableBuildEnvVariable(); // Enable before defining decorated classes
  
  @MyDecorator()
  class TestResource { }
});
```

Without this, metadata reflection fails and decorated classes won't be recognized.

## Typical Development Workflows

### Adding or Modifying a Resource Type
1. Create decorator in `packages/{service}/src/main/` using `createResourceDecorator()`
2. Create resolver in `packages/{service}/src/resolver/resolver.ts` implementing `ResolverType`
3. Add tests in `{service}.spec.ts` with `enableBuildEnvVariable()`
4. Register resolver in app via `createApp({ resolvers: [new YourResolver()] })`

### Working with Lambda Handlers
1. Define handler method with decorator (e.g., `@Get()`, `@Schedule()`)
2. Mark with `@Event()` and `@Payload()` for typed arguments
3. Handler files are bundled from declared `foldername`/`filename` by `lambdaAssets`
4. Use `@Permission()` metadata to grant IAM permissions (e.g., S3, DynamoDB)

### Cross-Resource References
1. Register resource globally: `bucket.isGlobal('bucket', 'my-bucket')`
2. In other handlers: `getResourceValue('bucket::my-bucket', 'arn')`
3. The resolver's `resolveCallbackResource()` validates references exist before deployment

## Key Files to Reference

- [Decorator factories](packages/common/src/decorators/) - How decorators capture metadata
- [ApiResolver](packages/api/src/resolver/resolver.ts) - Example resolver implementation
- [Module](packages/main/src/module/module.ts) - How modules process resources
- [Resource tracking](packages/resolver/src/resources/resource/resource.ts) - Global registration system
- [LambdaHandler](packages/resolver/src/resources/lambda/lambda.ts) - Lambda creation utilities

## Testing Guidelines

- Use `setupTestingStack()` from `@lafken/resolver` for CDKTF test stubs
- Enable `enableBuildEnvVariable()` before declaring decorated classes
- Mock resolvers by implementing `ResolverType` interface
- Use `matchTemplate()` from `cdktf/testing` to validate generated Terraform

## Common Pitfalls

1. **Metadata not captured**: Forget `enableBuildEnvVariable()` in tests
2. **Unresolved dependencies**: Reference non-existent resources via `getResourceValue()`
3. **Wrong formatter**: Use Biome (`pnpm format`) not Prettier
4. **Missing resolver**: Decorator @type must match a registered resolver
5. **Lambda path issues**: `filename`/`foldername` must match actual file locations used by bundler
