import type { ClassResource, LambdaProps } from '@alicanto/common';
import type { TerraformStack } from 'cdktf';
import type { Construct } from 'constructs';

import type { Role } from '../resources';

export interface StackConfigProps {
  role: Role;
  env: Record<string, any>;
  minify?: boolean;
  tags: Record<string, string>;
}

export type AlicantoResourceType<T extends new (...args: any[]) => Construct> =
  InstanceType<T> & {
    isGlobal(): void;
    isDependent(resolveDependency: () => void): void;
  };

export interface AppStack extends TerraformStack {
  id: string;
}

export interface AppModule extends Construct {
  id: string;
}

export interface LambdaGlobalConfig extends Omit<LambdaProps, 'tags' | 'env'> {
  env?: Record<string, string>;
}

export interface GlobalContext extends Omit<LambdaGlobalConfig, 'services'> {
  contextCreator: string;
}

export enum ContextName {
  app = 'app',
  module = 'module',
}

export interface ResolverType {
  type: string;
  beforeCreate?: (scope: AppStack) => Promise<void> | void;
  create: (module: AppModule, resource: ClassResource) => Promise<void> | void;
  afterCreate?: (scope: AppStack) => Promise<void> | void;
}
