import { type OutputType, registerRefResolvers } from '@lafken/common';
import { Fn, Lazy, Token } from 'cdktn';
import { contextFactory } from '../resources/context/context';
import { lafkenResource } from '../resources/resource/resource';
import { rootScope } from '../resources/root-scope/root-scope';
import { ssmFactory } from '../resources/ssm/ssm';

export class ResolveResources {
  /**
   * Returns a Terraform token that reads the resource from
   * `lafkenResource`'s registry lazily, when CDKTN synthesizes the stack.
   * By then every resource in the app has already been constructed and
   * registered, regardless of the declaration order between them, so the
   * lookup can be embedded directly in any resource property instead of
   * requiring a dedicated `value | callback` prop and a manual retry.
   */
  public getResourceValue(module: string, id: string, type: OutputType) {
    return Lazy.stringValue({
      produce: () => {
        const resource = lafkenResource.getResource(module, id);

        if (!resource) {
          throw new Error(
            `resource ${module}::${id} not found, please check the resource ref`
          );
        }

        if (!(type in resource)) {
          throw new Error(`property ${type} in ${module}::${id} not found`);
        }

        return resource[type];
      },
    });
  }
}

const resolveResources = new ResolveResources();

const pendingRefs: Array<() => void> = [];

const deferred = (materialize: () => void) => {
  pendingRefs.push(materialize);
};

/**
 * Eagerly runs every queued `Refs.*` data-source materialization, in
 * request order. Safe to call once `rootScope` has been set; a no-op if
 * nothing was queued. See `pendingRefs` above for why this exists.
 */
export const flushPendingRefs = () => {
  const queued = pendingRefs.splice(0, pendingRefs.length);
  for (const materialize of queued) {
    materialize();
  }
};

/**
 * Wires the real, cdktn-backed implementation into `@lafken/common`'s
 * `Refs` namespace (`Refs.resourceValue`, `Refs.ssmValue`,
 * `Refs.fn`, `Refs.token`, `Refs.accountId`, etc.). Runs as a
 * module side effect the moment any part of `@lafken/resolver` is imported,
 * which always happens before any decorated app file is loaded
 * (resolvers/`createApp` are imported first in every app entry point).
 * `Refs.accountId`/`callerArn`/`region`/`partition`/`dnsSuffix` defer
 * to `Lazy.stringValue` because `rootScope.set()` only runs inside
 * `createApp()`'s body, after the decorated files already imported and
 * potentially called these functions.
 */
registerRefResolvers({
  resolveResourceValue: (ref, attr) => {
    const [module, id] = ref.replace('::', '##').split('##');
    return resolveResources.getResourceValue(module, id, attr as OutputType);
  },
  resolveSsmValue: (path, secure) => {
    deferred(() => ssmFactory.getValue(rootScope.get(), path, secure));
    return Lazy.stringValue({
      produce: () => ssmFactory.getValue(rootScope.get(), path, secure),
    });
  },
  getAccountId: () => {
    deferred(() => contextFactory.getAccountId(rootScope.get()));
    return Lazy.stringValue({
      produce: () => contextFactory.getAccountId(rootScope.get()),
    });
  },
  getCallerArn: () => {
    deferred(() => contextFactory.getCallerArn(rootScope.get()));
    return Lazy.stringValue({
      produce: () => contextFactory.getCallerArn(rootScope.get()),
    });
  },
  getRegion: () => {
    deferred(() => contextFactory.getRegionName(rootScope.get()));
    return Lazy.stringValue({
      produce: () => contextFactory.getRegionName(rootScope.get()),
    });
  },
  getPartition: () => {
    deferred(() => contextFactory.getPartitionName(rootScope.get()));
    return Lazy.stringValue({
      produce: () => contextFactory.getPartitionName(rootScope.get()),
    });
  },
  getDnsSuffix: () => {
    deferred(() => contextFactory.getDnsSuffix(rootScope.get()));
    return Lazy.stringValue({
      produce: () => contextFactory.getDnsSuffix(rootScope.get()),
    });
  },
  fn: Fn,
  token: Token,
});
