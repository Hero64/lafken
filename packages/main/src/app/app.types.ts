import type { AwsProviderConfig } from '@cdktn/provider-aws/lib/provider';
import type { ServicesValues } from '@lafken/common';
import type { LambdaGlobalConfig, ResolverType } from '@lafken/resolver';
import type { S3BackendConfig } from 'cdktn';
import type { StackModule } from '../module';
import type { ModuleResolverType } from '../module/module.types';
import type { AppStack } from './app';

/**
 * Global configuration for the application.
 *
 * Defines shared settings that apply across all resources and Lambda
 * functions in the application. Individual resources can override
 * these values with their own specific configuration.
 */
export interface GlobalConfig {
  /**
   * Global Lambda configuration.
   *
   * Specifies default properties for all Lambda functions in the
   * application, such as memory, timeout, runtime, and services.
   * These values can be overridden at the module or resource level.
   *
   * @example
   * lambda: {
   *   memory: 512,
   *   timeout: 30,
   *   runtime: 22,
   *   services: ['s3', 'dynamodb'],
   * }
   */
  lambda?: LambdaGlobalConfig;
  /**
   * Global resource tags.
   *
   * Specifies a set of tags that will be applied to all resources
   * unless a resource explicitly defines its own tags. In that case,
   * the resource-specific tags will override the global values.
   */
  tags?: Record<string, string>;
  /**
   * Enables minification for all Lambda function bundles.
   *
   * When set to `true`, the bundled Lambda code will be minified
   * to reduce deployment package size and improve cold start times.
   *
   * @default undefined
   */
  minify?: boolean;
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
   * Each module groups related resources and handlers into a logical
   * unit with shared configuration. Modules are created using
   * `createModule()` and receive the application stack scope along
   * with the registered resolvers.
   *
   * @example
   * modules: [
   *   createModule({
   *     name: 'users',
   *     resources: [UserApi, UserQueue],
   *   }),
   * ]
   */
  modules: ((
    scope: AppStack,
    resources: Record<string, ModuleResolverType>,
    globalServices?: ServicesValues
  ) => Promise<StackModule>)[];
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
  /**
   * AWS provider configuration.
   *
   * Specifies the configuration for the AWS provider used by the
   * application stack. This includes settings such as the AWS region,
   * profile, and other provider-level options required for
   * deploying resources.
   *
   * @example
   * awsProviderConfig: {
   *   region: 'us-east-1',
   *   profile: 'my-aws-profile',
   * }
   */
  awsProviderConfig?: AwsProviderConfig;
  /**
   * S3 backend configuration for Terraform state.
   *
   * Configures an S3 bucket as the remote backend for storing the
   * Terraform state file. This enables team collaboration, state
   * locking, and centralized state management.
   *
   * @example
   * s3Backend: {
   *   bucket: 'my-terraform-state',
   *   key: 'app/terraform.tfstate',
   *   region: 'us-east-1',
   * }
   */
  s3Backend?: S3BackendConfig;
  /**
   * Extension callback.
   *
   * An optional async callback that is invoked after all modules and
   * resolvers have been fully processed. Use this to add custom
   * infrastructure or perform additional configuration on the
   * application stack that is not covered by the standard resolvers.
   *
   * @param scope - The application stack instance.
   *
   * @example
   * extend: async (scope) => {
   *   new S3Bucket(scope, 'custom-bucket', { bucket: 'my-bucket' });
   * }
   */
  extend?: (scope: AppStack) => Promise<void>;
}
