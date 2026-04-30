import type {
  EnvironmentValue,
  GetResourceProps,
  LambdaReferenceNames,
  ResourceOutputType,
} from '../../types';
import type { ServicesValues } from '../../types/services.types';

export type LambdaOutputAttributes = 'arn' | 'invokeArn' | 'qualifiedArn';

export interface VpcConfig {
  /**
   * Enables IPv6 for dual-stack networking.
   *
   * When set to `true`, the Lambda function will support both IPv4 and IPv6
   * traffic within the VPC. This is useful when the VPC subnets are configured
   * with dual-stack addressing.
   *
   * @default false
   */
  ipv6AllowedForDualStack?: boolean;
  /**
   * Security group IDs to associate with the Lambda function.
   *
   * Specifies one or more VPC security groups that control inbound and outbound
   * network traffic for the Lambda function. These security groups determine
   * which resources the Lambda can communicate with inside and outside the VPC.
   */
  securityGroupIds: string[];
  /**
   * Subnet IDs where the Lambda function will be deployed.
   *
   * Specifies one or more VPC subnets in which the Lambda function will run.
   * To ensure high availability, it is recommended to provide subnets across
   * multiple Availability Zones.
   */
  subnetIds: string[];
}

export type VpcConfigValue =
  | VpcConfig
  | ((props: Omit<GetResourceProps, 'getResourceValue'>) => VpcConfig);

export interface AliasConfig {
  /**
   * The name of the Lambda alias.
   *
   * This name will be used to create an AWS Lambda alias pointing to the
   * latest published version of the function. The alias acts as a stable
   * reference to a specific function version.
   */
  name: string;
  /**
   * Number of provisioned concurrent executions for this alias.
   *
   * When set to a value greater than 0, a `LambdaProvisionedConcurrencyConfig`
   * will be created, ensuring that the specified number of execution environments
   * are initialized and ready to respond immediately to invocations.
   *
   * This helps reduce cold start latency for latency-sensitive workloads.
   *
   * @default undefined (no provisioned concurrency)
   */
  provisionedExecutions?: number;
}
export interface LoggingConfig {
  /**
   * Log format for the Lambda function.
   *
   * Controls the format of the log records written to CloudWatch.
   * - `'Text'`: Unstructured text output (default Lambda behaviour).
   * - `'JSON'`: Structured JSON records, enabling `applicationLogLevel`
   *             and `systemLogLevel`.
   */
  logFormat: 'text' | 'json';
  /**
   * Log retention period in days.
   *
   * Specifies the number of days to retain Lambda invocation logs
   * in the CloudWatch Log Group before they are automatically deleted.
   * When omitted, the log group never expires.
   */
  retentionInDays?: number;
  /**
   * Application-level log verbosity.
   *
   * Only valid when `logFormat` is `'json'`.
   * Controls the level of logs emitted by your function code.
   *
   * Supported values: `'trace'` | `'debug'` | `'info'` | `'warn'` | `'error'` | `'fatal'`
   */
  applicationLogLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  /**
   * System-level log verbosity.
   *
   * Only valid when `logFormat` is `'json'`.
   * Controls the level of logs emitted by the Lambda runtime itself.
   *
   * Supported values: `'debug'` | `'info'` | `'warn'`
   */
  systemLogLevel?: 'debug' | 'info' | 'warn';
}

export interface LambdaProps {
  /**
   * Lambda execution timeout.
   *
   * Specifies the maximum amount of time (in seconds) that the Lambda
   * function is allowed to run before being terminated. If the execution
   * exceeds this limit, the function will be stopped and an error will be raised.
   */
  timeout?: number;
  /**
   * Lambda memory allocation.
   *
   * Specifies the amount of memory (in MB) allocated to the Lambda function.
   * Increasing memory also increases the CPU and network resources proportionally.
   */
  memory?: number;
  /**
   * Lambda NodeJS runtime
   *
   * Defines the Node.js runtime environment that the Lambda will use
   * during execution. Only supported LTS versions are allowed to ensure
   * long-term stability and AWS compatibility.
   *
   * Supported values:
   * - `24` → Node.js 24
   * - `22` → Node.js 22
   * - `20` → Node.js 20
   */
  runtime?: 24 | 22 | 20;
  /**
   * Lambda services.
   *
   * Defines which AWS services the Lambda function is allowed to access.
   * Internally, a role is created with the specified service permissions,
   * granting the Lambda the ability to interact with those resources.
   */
  services?: ServicesValues;
  /**
   * Lambda environments.
   *
   * Defines environment values that will be applied specifically to
   * this Lambda. These values override any global or stack-level
   * environment configuration.
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
  env?: EnvironmentValue;
  /**
   * Lambda tags.
   *
   * Specifies a set of tags that will be applied to lambda function.
   */
  tags?: Record<string, string>;
  /**
   * Enables AWS X-Ray tracing for Lambda function.
   *
   * When set to `true`, X-Ray tracing is activated, allowing you to
   * collect detailed information about requests, performance, and
   * interactions with other AWS services.
   *
   * This is useful for debugging, monitoring, and gaining visibility
   * into the execution flow of your Lambda.
   */
  enableTrace?: boolean;
  /**
   * VPC configuration for the Lambda function.
   *
   * When provided, the Lambda function will be deployed inside the specified
   * VPC, allowing it to access private resources such as RDS databases,
   * ElastiCache clusters, or internal services that are not publicly accessible.
   *
   * Requires specifying at least one subnet and one security group.
   */
  vpcConfig?: VpcConfigValue;
  /**
   * Alias configuration for the Lambda function.
   *
   * When provided, the Lambda function will be published (creating a new version)
   * and a Lambda alias will be created pointing to the latest published version.
   *
   * If `provisionedExecutions` is set to a value greater than 0, a provisioned
   * concurrency configuration will also be created for the alias to reduce
   * cold start latency.
   *
   * @example
   * // Create an alias without provisioned concurrency
   * { name: 'live' }
   *
   * @example
   * // Create an alias with provisioned concurrency
   * { name: 'live', provisionedExecutions: 5 }
   */
  alias?: AliasConfig;
  /**
   * Logging configuration for the Lambda function.
   *
   * When provided, configures the CloudWatch logging behaviour for the
   * Lambda function. If `logGroup` is specified, a `CloudwatchLogGroup`
   * resource will be created and linked automatically.
   *
   * @example
   * { logFormat: 'Text', logGroup: { name: '/aws/lambda/my-fn', retentionInDays: 30 } }
   *
   * @example
   * { logFormat: 'JSON', applicationLogLevel: 'WARN', systemLogLevel: 'INFO' }
   */
  loggingConfig?: LoggingConfig;
  /**
   * Output configuration for the Lambda function.
   *
   * Defines which attributes should be exported to SSM Parameter Store or
   * as Terraform outputs. Supported attributes: `'arn'`, `'invokeArn'`, `'qualifiedArn'`.
   */
  outputs?: ResourceOutputType<LambdaOutputAttributes>;
  /**
   * Registers this Lambda as a named global reference.
   *
   * Allows other resources to look up this function by name via
   * `lafkenResource.getResource('lambda', ref)`.
   */
  ref?: LambdaReferenceNames;
}

export interface LambdaMetadata {
  name: string;
  lambda?: LambdaProps;
  description?: string;
}

export enum LambdaReflectKeys {
  handlers = 'lambda:handlers',
  arguments = 'lambda:arguments',
  event_param = 'lambda:event_params',
  event_class = 'lambda:event_class',
}

export enum LambdaArgumentTypes {
  event = 'event',
  context = 'context',
}

export type CallbackParam = (error: boolean | null, response?: any) => void;

export type LambdaArguments = Record<string, LambdaArgumentTypes[]>;
export type LambdaArgumentsType = Record<
  LambdaArgumentTypes,
  ({
    event,
    context,
  }: {
    event: any;
    context: any;
    methodName: string;
    target: any;
  }) => any
>;

export interface CreateLambdaDecoratorProps<T, M> {
  getLambdaMetadata: (params: T, methodName: string) => M;
  descriptorValue?: (descriptor: PropertyDescriptor) => any;
  validateEvent?: (target: any, methodName: string, event: any) => void;
  argumentParser?: Partial<LambdaArgumentsType | (string & {})>;
}

export interface CreateEventDecoratorProps {
  prefix: string;
  enableInLambdaInvocation?: boolean;
}
