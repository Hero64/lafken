import type { ClassResource, ResourceMetadata } from '@alicanto/common';
import type { ResolverType } from '@alicanto/resolver';
import type { Construct } from 'constructs';
import type { GlobalConfig } from '../app/app.types';
import type { StackModule } from './module';

export interface CreateModuleProps {
  /**
   * Module name.
   *
   * Specifies the name of the module, which will be used as an identifier
   * for all resources created within this stack.
   */
  name: string;
  /**
   * Module resources.
   *
   * Defines the list of resources to be created within this stack.
   * Each item represents a resource such as Api, Queue, StateMachine, etc.
   */
  resources: ClassResource[];
  /**
   * Module-level global configuration.
   *
   * Provides settings that are applied to all resources and Lambda functions
   * within this specific module. This configuration behaves similarly to
   * the application-wide `GlobalConfig`, but excludes environment settings (`env`),
   * which are managed at the application level.
   */
  globalConfig?: Omit<GlobalConfig, 'env'>;
}

export interface ModuleProps extends CreateModuleProps {
  resolvers: Record<string, ResolverType>;
}

export interface ModuleResource {
  module: StackModule;
  metadata: ResourceMetadata;
  Resource: ClassResource;
}

export interface ModuleResolverType extends ResolverType {}
export interface ModuleConstruct extends Construct {}
