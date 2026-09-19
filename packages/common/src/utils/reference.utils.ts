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
 * real, cdktn-backed implementation behind the functions in this file.
 * `@lafken/common` never imports cdktn directly, so Lambda bundles that only
 * import `@lafken/common` never pull it in either. When no resolver package
 * is loaded — an actual Lambda invocation, or a unit test that only exercises
 * handler logic — every function here returns `undefined` (or a safe no-op
 * for `fn`/`token`), which is safe because nothing reachable from that
 * context ever reads their result.
 *
 * Guards against being called more than once per process: a second call
 * would silently swap the resolvers every reference function reads from,
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
 * References an attribute of another Lafken resource (e.g. an ARN or ID).
 *
 * Returns the real resolved value directly — it can be dropped as the value
 * of any resource or lambda config property, at any depth (env vars, plain
 * strings, numbers, arrays, nested objects), with no dedicated `value |
 * callback` type needed. It is resolved once the whole app has been built,
 * regardless of the declaration order between the resources involved.
 *
 * @example
 * env: { queueArn: getResourceValue('queue::orders', 'id') }
 */
export const getResourceValue = <T = string>(
  ref: AvailableReference,
  attr: OutputType
): T => {
  if (!refResolvers) {
    return undefined as unknown as T;
  }
  return refResolvers.resolveResourceValue(ref, attr) as unknown as T;
};

/**
 * References a value from AWS Systems Manager Parameter Store.
 *
 * Can be used directly as the value of any resource or lambda config
 * property, the same way `getResourceValue()` can.
 *
 * @example
 * runtime: getSSMValue<24 | 22>('example/runtime')
 */
export const getSSMValue = <T = string>(path: string, secure = false): T => {
  if (!refResolvers) {
    return undefined as unknown as T;
  }
  return refResolvers.resolveSsmValue(path, secure) as unknown as T;
};

/**
 * AWS account ID where the stack is being deployed, resolved at deployment
 * time from the caller credentials (e.g. `'123456789012'`).
 *
 * @example
 * fn.format('arn:%s:iam::%s:role/my-role', [getPartition(), getAccountId()])
 */
export const getAccountId = (): string => refResolvers?.getAccountId() as string;

/**
 * ARN associated with the caller credentials used during deployment.
 */
export const getCallerArn = (): string => refResolvers?.getCallerArn() as string;

/**
 * AWS region name where the stack is being deployed (e.g. `'us-east-1'`).
 */
export const getRegion = (): string => refResolvers?.getRegion() as string;

/**
 * AWS partition the stack is deployed in (e.g. `'aws'`, `'aws-cn'`, `'aws-us-gov'`).
 */
export const getPartition = (): string => refResolvers?.getPartition() as string;

/**
 * Base DNS domain for the current AWS partition (e.g. `'amazonaws.com'`).
 */
export const getDnsSuffix = (): string => refResolvers?.getDnsSuffix() as string;

/**
 * Terraform built-in functions for string manipulation, encoding, list
 * operations, and conditional expressions. Backed by cdktn's `Fn`, injected
 * by `@lafken/resolver` — safe to call anywhere, a no-op outside build mode.
 *
 * @example
 * fn.upper('hello')
 */
export const fn: TerraformFn = createLazyNamespace((resolvers) => resolvers.fn);

/**
 * Terraform token utilities for converting and inspecting unresolved token
 * values. Backed by cdktn's `Token`, injected by `@lafken/resolver`.
 *
 * @example
 * token.isUnresolved(someValue)
 */
export const token: TerraformToken = createLazyNamespace((resolvers) => resolvers.token);
