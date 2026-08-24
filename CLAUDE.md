# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Lafken is a TypeScript framework for building serverless AWS applications using decorators. It transforms decorated application code into Terraform infrastructure via CDKTN (cdk-terrain). It is a pnpm + Turborepo monorepo publishing `@lafken/*` packages.

All documentation, comments, and communications must be in English.

## Commands

```bash
pnpm install              # install (requires Node >= 20.19, pnpm >= 10.20)
pnpm build                # build all packages (turbo, respects dependency order)
pnpm test                 # run all tests
pnpm lint                 # lint (Biome)
pnpm format               # format with Biome (do NOT use Prettier)
pnpm check-types          # typecheck (requires dependencies built first — run via turbo from root)
```

Per-package (vitest; tests alias `@lafken/*` to sibling `src/`, so no prior build needed):

```bash
pnpm --filter @lafken/api test                          # one package's tests
pnpm --filter @lafken/api test src/resolver/resolver.spec.ts   # single test file
```

Commits follow Conventional Commits (`feat(api): ...`), enforced by commitlint/husky. Scope is the package name (`api`, `resolver`, `queue`, ...). All packages share one version, bumped with `pnpm update-version` (scripts/version.js).

## Architecture

**Key flow**: `@Decorator` → resource class → `createModule()` → `createApp()` → resolver → CDKTN constructs → Terraform.

1. **Decorators** (`@Api`, `@Get`, `@Queue`, `@StateMachine`, ...) mark classes/methods as infrastructure resources. They are built with `createResourceDecorator()` / `createLambdaDecorator()` from `@lafken/common` and capture metadata via reflection: `type` (matched against registered resolvers), `filename`/`foldername` (for Lambda bundling), `originalName`.
2. **Resolvers** (one per AWS service package) implement `ResolverType` with three lifecycle hooks:
   - `beforeCreate(scope)` — shared resources
   - `create(module, resource)` — process each decorated resource
   - `afterCreate(scope)` — wire integrations
   Resolvers inspect decorated classes via `getResourceMetadata()` / `getResourceHandlerMetadata()`.
3. **Modules** (`packages/main/src/module/`) group resources with shared config; **Apps** (`createApp`) orchestrate modules + resolvers. A decorator's `type` must match a registered resolver or the resource is silently unhandled.

### Packages

- `packages/main` — core engine: `createApp`, `createModule`, `AppContext` (per-app/per-module config: memory, timeout, runtime, services)
- `packages/common` — decorator factories, metadata reflection, shared types
- `packages/resolver` — base `ResolverType`, Lambda utilities (`lambdaAssets`), IAM roles, global resource tracking
- `packages/api`, `queue`, `event`, `schedule`, `state-machine`, `bucket`, `dynamo`, `auth`, `standalone` — one resolver + decorators per AWS service
- `apps/example` — example app

Service packages expose two entry points: `@lafken/{pkg}/main` (decorators, used by app code) and `@lafken/{pkg}/resolver` (infrastructure generation).

### Cross-resource references

Resources register globally with `isGlobal(module, id)` and are referenced elsewhere via `getResourceValue('scope::resourceId', 'arn')` (implemented in `packages/resolver/src/resources/resource/resource.ts` via `lafkenResource.make()`). Lambda env vars support static values, `getResourceValue()` callbacks, and SSM (`getSSMValue()` / `'SSM::STRING::/path'`). References are validated by `resolveCallbackResource()` before deployment.

Complex resolvers use factory chains, e.g. API: RestApi → ResourceFactory → MethodFactory → IntegrationFactory (`packages/api/src/resolver/rest-api/`).

## Testing

- **Critical**: decorators only work in build mode. Call `enableBuildEnvVariable()` from `@lafken/common` *before* declaring decorated classes in a test, or metadata reflection silently fails.
- Use `setupTestingStack()` from `@lafken/resolver` for CDKTN test stubs and `matchTemplate()` from cdktn testing to assert on generated Terraform.
- Tests are `src/**/*.spec.ts`, run by vitest with an SWC plugin providing decorator metadata (see any package's `vitest.config.ts`).

## Adding a Resource Type

1. Decorator in `packages/{service}/src/main/` using `createResourceDecorator()`
2. Resolver in `packages/{service}/src/resolver/resolver.ts` implementing `ResolverType`
3. Tests (`*.spec.ts`) with `enableBuildEnvVariable()`
4. Registered by users via `createApp({ resolvers: [...] })`
