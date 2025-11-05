import { Construct } from 'constructs';

class AlicantoResource {
  private globals: Record<string, Construct> = {};
  private dependent: (() => void)[] = [];

  make<T extends new (...args: any[]) => Construct>(ExtendResource: T) {
    const self = this;

    if (!(ExtendResource.prototype instanceof Construct)) {
      throw new Error('Only classes that extend from Construct are permitted.');
    }

    class Resource extends ExtendResource {
      #id: string;

      constructor(...props: any[]) {
        super(...props);
        this.#id = props[1];
      }
      isGlobal(module: string) {
        self.globals[`${module}-${this.#id}`] = this;
      }

      isDependent(resolveDependency: () => void) {
        self.dependent.push(resolveDependency);
      }
    }

    return Resource;
  }
  getResource<T = any>(id: string): T {
    return this.globals[id] as T;
  }

  async callDependentCallbacks() {
    for (const callback of this.dependent) {
      await callback();
    }
  }
}

export const alicantoResource = new AlicantoResource();
