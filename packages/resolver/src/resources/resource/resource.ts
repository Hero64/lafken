import type { ModuleGlobalReferenceNames } from '@lafken/common';
import { Construct } from 'constructs';

class LafkenResource {
  private globals: Record<string, Construct> = {};
  private dependent: (() => void)[] = [];

  make<T extends new (...args: any[]) => Construct>(ExtendResource: T) {
    const self = this;

    if (!(ExtendResource.prototype instanceof Construct)) {
      throw new Error('Only classes that extend from Construct are permitted.');
    }

    class Resource extends ExtendResource {
      isGlobal(module: ModuleGlobalReferenceNames | (string & {}), id: string) {
        self.globals[`${module}::${id}`] = this;
      }

      isDependent(resolveDependency: () => void) {
        self.dependent.push(resolveDependency);
      }
    }

    return Resource;
  }

  reset() {
    this.globals = {};
    this.dependent = [];
  }

  getResource<T = any>(
    module: ModuleGlobalReferenceNames | (string & {}),
    id: string
  ): T {
    return this.globals[`${module}::${id}`] as T;
  }

  async callDependentCallbacks() {
    for (const callback of this.dependent) {
      await callback();
    }
  }
}

export const lafkenResource = new LafkenResource();
