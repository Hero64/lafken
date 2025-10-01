import type { Construct } from 'constructs';

import type { DependentResource } from './resource.types';

class AlicantoResource {
  private globals: Record<string, Construct> = {};
  private dependent: DependentResource[];

  create = <T extends new (...args: any[]) => Construct>(
    ExtendResource: T,
    ...props: ConstructorParameters<T>
  ) => {
    const self = this;
    class Resource extends ExtendResource {
      isGlobal() {
        // TODO: ver la forma de exportar valores
        self.globals[props[0]] = this;
      }

      isDependent(resolveDependency: () => void) {
        self.dependent.push({
          resolveDependency,
          resource: this,
        });
      }
    }
    return new Resource(...props);
  };
}

export const alicantoResource = new AlicantoResource();
