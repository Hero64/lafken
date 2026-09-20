import type { RegisterNamespaces } from '@lafken/common';
import { Construct } from 'constructs';

class LafkenResource {
  private registry: Record<string, Construct> = {};

  make<T extends new (...args: any[]) => Construct>(ExtendResource: T) {
    const self = this;

    if (!(ExtendResource.prototype instanceof Construct)) {
      throw new Error('Only classes that extend from Construct are permitted.');
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

  reset() {
    this.registry = {};
  }

  getResource<T = any>(module: RegisterNamespaces | (string & {}), id: string): T {
    return this.registry[`${module}::${id}`] as T;
  }
}

export const lafkenResource = new LafkenResource();
