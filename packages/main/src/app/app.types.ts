import type { LambdaGlobalConfig, ResolverType } from '@alicanto/resolver';
import type { TerraformStack } from 'cdktf';
import type { ModuleResource } from '../module/module.types';

export interface GlobalConfig {
  lambda?: LambdaGlobalConfig;
  /**
   * Global resource tags.
   *
   * Specifies a set of tags that will be applied to all resources
   * unless a resource explicitly defines its own tags. In that case,
   * the resource-specific tags will override the global values.
   */
  tags?: Record<string, string>;
}

export interface CreateAppProps {
  /**
   * Application name.
   *
   * Specifies the name of the application, which is used within
   * the AWS stack as an identifier for resources.
   *
   * @example
   * name: "my-awesome-app"
   */
  name: string;
  /**
   * Application modules.
   *
   * Defines the set of modules to be created within the application.
   */
  modules: ((
    scope: TerraformStack,
    resources: Record<string, ResolverType>
  ) => Promise<ModuleResource>)[];
  /**
   * Resource resolvers.
   *
   * Defines the list of resolvers responsible for creating and configuring
   * resources loaded by the stacks. Each resolver can receive detailed
   * configuration options depending on the type of resource it manages.
   *
   * For example, an `ApiResolver` can include REST API settings,
   * deployment options, and authorization configurations.
   */
  resolvers: ResolverType[];
  /**
   * Global configuration for the application.
   *
   * Provides settings that are applied across all resources, stacks,
   * and Lambda functions unless overridden at a lower level.
   * This includes global Lambda properties, environment configuration,
   * and resource tags.
   */
  globalConfig?: GlobalConfig;
}
