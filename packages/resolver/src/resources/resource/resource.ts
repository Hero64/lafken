import type { Construct } from 'constructs';
import type { DependentResource } from './resource.types';

class AlicantoResource {
  private globals: Record<string, Construct> = {};
  private dependent: DependentResource[] = [];

  create = <T extends new (...args: any[]) => Construct>(
    ExtendResource: T,
    ...props: ConstructorParameters<T>
  ): InstanceType<T> & {
    isGlobal(): void;
    isDependent(resolveDependency: () => void): void;
  } => {
    const self = this;

    class Resource extends ExtendResource {
      isGlobal() {
        self.globals[props[0] as string] = this;
      }

      isDependent(resolveDependency: () => void) {
        self.dependent.push({
          resolveDependency,
          resource: this,
        });
      }
    }

    return new Resource(...props) as InstanceType<T> & {
      isGlobal(): void;
      isDependent(resolveDependency: () => void): void;
    };
  };
}

export const alicantoResource = new AlicantoResource();
