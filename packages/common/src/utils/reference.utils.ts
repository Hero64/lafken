import type { OutputType } from '../types/output.types';
import type { AvailableReference } from '../types/override-resources.types';
import type { TerraformFn, TerraformToken } from '../types/resource.types';

export interface RefResolvers {
  resolveResourceValue: (ref: string, attr: string) => string;
  resolveSsmValue: (path: string, secure: boolean) => string;
  getAccountId: () => string;
  getCallerArn: () => string;
  getRegion: () => string;
  getPartition: () => string;
  getDnsSuffix: () => string;
  fn: TerraformFn;
  token: TerraformToken;
}

let refResolvers: RefResolvers | undefined;

/**
 * Called once by `@lafken/resolver` (as a module side effect) to provide the
 * real, cdktn-backed implementation behind `Refs`. `@lafken/common`
 * never imports cdktn directly, so Lambda bundles that only import
 * `@lafken/common` never pull it in either. When no resolver package is
 * loaded — an actual Lambda invocation, or a unit test that only exercises
 * handler logic — every `Refs` member returns `undefined` (or a safe
 * no-op for `fn`/`token`), which is safe because nothing reachable from that
 * context ever reads their result.
 *
 * Guards against being called more than once per process: a second call
 * would silently swap the resolvers every `Refs` member reads from,
 * which is far more likely to be a bundling/module-duplication bug than an
 * intentional re-registration.
 */
export const registerRefResolvers = (resolvers: RefResolvers) => {
  if (refResolvers) {
    throw new Error('registerRefResolvers() must only be called once per process');
  }
  refResolvers = resolvers;
};

const createLazyNamespace = <T extends object>(pick: (resolvers: RefResolvers) => T): T =>
  new Proxy({} as T, {
    get(_target, prop) {
      const ns = refResolvers && pick(refResolvers);
      if (!ns) {
        return () => undefined;
      }
      const value = (ns as Record<PropertyKey, unknown>)[prop as string];
      return typeof value === 'function' ? value.bind(ns) : value;
    },
  });

/**
 * Namespace of free functions that resolve real infrastructure values — the
 * ARN of another resource, an SSM parameter, the current account ID, a
 * Terraform built-in function — and can be dropped directly as the value of
 * any resource or lambda config property, at any depth (env vars, plain
 * strings, numbers, arrays, nested objects). No callback, no injected
 * `props` object — just call the member where you need the value.
 *
 * Every member is resolved lazily: the actual value is only computed once
 * the whole app has been built and synthesized, regardless of the
 * declaration order between the resources involved. Outside of build mode
 * (e.g. inside the deployed Lambda handler itself, or a unit test that only
 * exercises business logic), every member is a safe no-op that returns
 * `undefined` without throwing — `@lafken/common` never imports `cdktn`, so
 * calling them from Lambda runtime code has no cost.
 *
 * `registerRefResolvers()` is the injection point `@lafken/resolver` uses to
 * wire the real CDKTN-backed implementation into this namespace;
 * application code never calls it directly.
 */
export class Refs {
  /**
   * References an attribute of another Lafken resource (e.g. an ARN or ID).
   *
   * @example
   * env: { queueArn: Refs.resourceValue('queue::orders', 'id') }
   */
  static resourceValue<T = string>(ref: AvailableReference, attr: OutputType): T {
    if (!refResolvers) {
      return undefined as unknown as T;
    }
    return refResolvers.resolveResourceValue(ref, attr) as unknown as T;
  }

  /**
   * References a value from AWS Systems Manager Parameter Store.
   *
   * Can be used directly as the value of any resource or lambda config
   * property, the same way `resourceValue()` can.
   *
   * @example
   * runtime: Refs.ssmValue<24 | 22>('example/runtime')
   */
  static ssmValue<T = string>(path: string, secure = false): T {
    if (!refResolvers) {
      return undefined as unknown as T;
    }
    return refResolvers.resolveSsmValue(path, secure) as unknown as T;
  }

  /**
   * AWS account ID where the stack is being deployed, resolved at
   * deployment time from the caller credentials (e.g. `'123456789012'`).
   *
   * @example
   * Refs.fn.format('arn:%s:iam::%s:role/my-role', [Refs.partition(), Refs.accountId()])
   */
  static accountId(): string {
    return refResolvers?.getAccountId() as string;
  }

  /** ARN associated with the caller credentials used during deployment. */
  static callerArn(): string {
    return refResolvers?.getCallerArn() as string;
  }

  /** AWS region name where the stack is being deployed (e.g. `'us-east-1'`). */
  static region(): string {
    return refResolvers?.getRegion() as string;
  }

  /** AWS partition the stack is deployed in (e.g. `'aws'`, `'aws-cn'`, `'aws-us-gov'`). */
  static partition(): string {
    return refResolvers?.getPartition() as string;
  }

  /** Base DNS domain for the current AWS partition (e.g. `'amazonaws.com'`). */
  static dnsSuffix(): string {
    return refResolvers?.getDnsSuffix() as string;
  }

  /**
   * Terraform built-in functions for string manipulation, encoding, list
   * operations, and conditional expressions. Backed by cdktn's `Fn`,
   * injected by `@lafken/resolver` — safe to call anywhere, a no-op outside
   * build mode.
   *
   * @example
   * Refs.fn.upper('hello')
   */
  static fn = createLazyNamespace((resolvers) => resolvers.fn) as TerraformFn;

  /**
   * Terraform token utilities for converting and inspecting unresolved
   * token values. Backed by cdktn's `Token`, injected by `@lafken/resolver`.
   *
   * @example
   * Refs.token.isUnresolved(someValue)
   */
  static token = createLazyNamespace((resolvers) => resolvers.token) as TerraformToken;
}
