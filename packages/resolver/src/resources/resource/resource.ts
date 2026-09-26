import type { RegisterNamespaces } from '@lafken/common';
import { Construct } from 'constructs';

/**
 * Global registry of resource instances, shared across every resolver in
 * the app. It lets a resource wrapped with `make()` be `register()`-ed
 * under a namespaced key and looked up later from anywhere — typically
 * through `Refs.resourceValue()`, which resolves it lazily at synth time.
 */
class LafkenResource {
  private registry: Record<string, Construct> = {};

  /**
   * Mixes resource-tracking behavior into any CDKTN `Construct` subclass,
   * so its instances gain a `register()` method. Works with resources
   * Lafken already ships a resolver for as well as arbitrary/unsupported
   * ones — `ExtendResource` only needs to extend `Construct`.
   *
   * @throws {Error} If `ExtendResource` does not extend `Construct`.
   */
  make<T extends new (...args: any[]) => Construct>(ExtendResource: T) {
    const self = this;

    if (!(ExtendResource.prototype instanceof Construct)) {
      throw new Error(
        `lafkenResource.make() received "${ExtendResource.name}", which does not extend Construct.`
      );
    }

    class Resource extends ExtendResource {
      /**
       * Registers this resource under a namespaced key so it can be
       * retrieved globally via `getResource(module, id)`.
       */
      register(namespaces: RegisterNamespaces | (string & {}), id: string) {
        self.registry[`${namespaces}::${id}`] = this;
      }
    }

    return Resource;
  }

  /**
   * Clears the registry. `lafkenResource` is a module-level singleton, so
   * tests call this between cases to avoid resources registered in one
   * test leaking into the next.
   */
  reset() {
    this.registry = {};
  }

  /**
   * Retrieves a resource previously registered via `register()`.
   * Returns `undefined` if no resource was registered under that key.
   */
  getResource<T = any>(module: RegisterNamespaces | (string & {}), id: string): T {
    return this.registry[`${module}::${id}`] as T;
  }
}

export const lafkenResource = new LafkenResource();
