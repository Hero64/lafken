import type { EnvironmentValue, ServicesValues } from '@alicanto/common';
import type { ResolverType } from '@alicanto/resolver';

import type { ModuleResource } from '../module/module.types';
import type { AppStack } from './app';

export interface LambdaGlobalProps {
  /**
   * Global environment variables for Lambda functions.
   *
   * Specifies environment values that will be applied to all Lambdas
   * unless overridden at the stack or individual Lambda level.
   *
   * Values can be provided in three formats:
   * 1. `string` - The value will be taken from the `.env` file if present.
   * 2. `Record<string, string | number | boolean | EnvFunction>` - Directly provides the value as a string.
   * 3. `Record<string, EnvFunction>` - Functions can compute dynamic values based on resources
   *    created in the project, using the `getResourceValue` helper.
   *
   * @example
   * // Load value from .env
   * ["ENV_VALUE"]
   *
   * @example
   * // Provide static values
   * [
   *   { "ENV_VALUE": "static_string" },
   *   { "ENV_NUMBER": 123 }
   * ]
   *
   * @example
   * // Provide dynamic values from resources
   * [
   *   {
   *     "ENV_VALUE": {
   *       name: "any",
   *       other: ({ getResourceValue }) => getResourceValue("s3_bucket", "arn")
   *     }
   *   }
   * ]
   */
  env?: EnvironmentValue[];
  /**
   * Enabled AWS services for Lambda functions.
   *
   * Defines which services are granted access within Lambda functions.
   * Internally, a role is created with the specified services. These
   * permissions will be applied to all Lambdas unless overridden at
   * the stack or individual Lambda level.
   *
   * If no value is provided, a default set of services commonly used
   * in serverless applications will be enabled:
   * `dynamodb`, `s3`, `lambda`, `cloudwatch`, `sqs`, `state_machine`,
   * `kms`, `ssm`, `event`.
   */
  services?: ServicesValues[];
  /**
   * Specifies whether the code should be minified when the lambda is processed
   *
   * @default true
   */
  minify?: boolean;
}

interface EnvGlobalConfig {
  /**
   * Enables or disables the use of environment variables
   * sourced from the `.env` file.
   *
   * @default true
   */
  enabled?: boolean;

  /**
   * The name of the `.env` file that provides environment variables.
   *
   * @default ".env"
   */
  fileName: string;
}

export interface GlobalConfig {
  lambda?: LambdaGlobalProps;
  /**
   * Global resource tags.
   *
   * Specifies a set of tags that will be applied to all resources
   * unless a resource explicitly defines its own tags. In that case,
   * the resource-specific tags will override the global values.
   */
  tags?: Record<string, string>;
  /**
   * Environment configuration settings.
   *
   * This configuration defines how environment variables are sourced
   * and applied to application resources such as Lambda functions.
   *
   * - Variables are read from the specified `.env` file.
   * - If a resource does not define its own environment configuration,
   *   it will inherit the full set of variables from the file.
   * - If a resource has its own environment configuration, those values
   *   will take precedence over the global ones defined at startup.
   *
   * @example
   * {
   *   enabled: true,
   *   fileName: ".env.production"
   * }
   *
   * @example
   * {
   *   enabled: true
   * }
   */
  env?: EnvGlobalConfig;
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
    scope: AppStack,
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
