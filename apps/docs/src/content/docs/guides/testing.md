---
title: Testing
description: Testing code that uses Lafken decorators, and testing custom resolvers against the Terraform they generate.
---

Lafken's decorators only capture metadata when the process is running in **build mode** — the same mode used when synthesizing infrastructure. Outside of it, `@Api`, `@Get`, `@Table`, and every other decorator become no-ops, so metadata reflection silently returns nothing.

This matters the moment a test file declares a decorated class, which any test of Lafken-based code naturally does — your resources *are* decorated classes.

## Enable Build Mode

Call `enableBuildEnvVariable()` from `@lafken/common` before declaring any decorated class in a test:

```typescript
import { enableBuildEnvVariable } from '@lafken/common';

describe('UserApi', () => {
  enableBuildEnvVariable();

  @Api({ path: '/users' })
  class UserApi {
    @Get({ path: '/{id}' })
    getUser(@Event(GetUserRequest) req: GetUserRequest) {
      return { id: req.id };
    }
  }

  it('returns the requested id', () => {
    const api = new UserApi();
    expect(api.getUser({ id: '42' })).toEqual({ id: '42' });
  });
});
```

`enableBuildEnvVariable()` sets the `LAFKEN_CONTEXT` environment variable to `BUILD`; `isBuildEnvironment()` (also from `@lafken/common`) is what every decorator checks before recording metadata. Call it once per test file, before the first decorated class — declaring the class first and enabling build mode after leaves that class with no metadata, and every assertion against it fails or silently passes on `undefined`.

## Testing a Custom Resolver

If you're building a resolver — see [Adding a Resource Type](/guides/adding-a-resource-type/) — you'll want to assert on the actual Terraform it generates, not just call its methods directly. `@lafken/resolver` and `@cdktn/vitest` provide the pieces for that.

### 1. Wire up the matchers

Add `@cdktn/vitest`'s setup to your package's Vitest config:

```typescript title="vitest.setup.mts"
import { setupVitest } from '@cdktn/vitest';

setupVitest();
```

```json title="tsconfig.json"
{
  "compilerOptions": {
    "types": ["node", "@cdktn/vitest"]
  }
}
```

This registers a handful of custom matchers on Vitest's `expect`: `toHaveResource`, `toHaveResourceWithProperties`, `toHaveDataSource`, `toHaveDataSourceWithProperties`, `toHaveProvider`, `toHaveProviderWithProperties`, `toBeValidTerraform`, and `toPlanSuccessfully`.

### 2. Build a test stack and run the resolver

`setupTestingStack()` (or `setupTestingStackWithModule()`, when your resolver needs a module scope) from `@lafken/resolver` creates a CDKTN app and stack ready for synthesis, with no real AWS provider required:

```typescript
import { S3Bucket } from '@cdktn/provider-aws/lib/s3-bucket';
import { enableBuildEnvVariable } from '@lafken/common';
import { type AppModule, setupTestingStack } from '@lafken/resolver';
import { Testing } from 'cdktn';
import { Bucket } from '../main';
import { BucketResolver } from './resolver';

describe('bucket resolver', () => {
  enableBuildEnvVariable();

  it('creates a bucket with the class name', async () => {
    @Bucket()
    class ImagesBucket {}

    const { stack } = setupTestingStack();
    const resolver = new BucketResolver([ImagesBucket]);

    await resolver.beforeCreate(stack as unknown as AppModule);

    const synthesized = Testing.synth(stack);
    expect(synthesized).toHaveResourceWithProperties(S3Bucket, {
      bucket: 'ImagesBucket',
    });
  });
});
```

Call whichever lifecycle hook the behavior you're testing lives in — `beforeCreate`, `create`, or `afterCreate` — then run `Testing.synth(stack)` from `cdktn` and assert against the result with the matchers above. This is exactly how every resolver package in this repository (`@lafken/bucket`, `@lafken/dynamo`, `@lafken/api`, ...) tests itself; their `*.spec.ts` files under `src/resolver/` are the best source of further examples.
