import type { EnvironmentValue } from '../../types';
import type { ServicesValues } from '../../types/services.types';

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
   * - `22` → Node.js 22
   * - `20` → Node.js 20
   * - `18` → Node.js 18
   */
  runtime?: 22 | 20 | 18;
  /**
   * Lambda services.
   *
   * Defines which AWS services the Lambda function is allowed to access.
   * Internally, a role is created with the specified service permissions,
   * granting the Lambda the ability to interact with those resources.
   */
  services?: ServicesValues[];
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
}

export enum LambdaArgumentTypes {
  event = 'event',
  callback = 'callback',
  context = 'context',
}

export type CallbackParam = (error: boolean | null, response?: any) => void;

export type LambdaArguments = Record<string, LambdaArgumentTypes[]>;
export type LambdaArgumentsType = Record<
  LambdaArgumentTypes,
  ({
    event,
    context,
    callback,
  }: {
    event: any;
    context: any;
    methodName: string;
    target: any;
    callback: CallbackParam;
  }) => any
>;

export interface CreateLambdaDecoratorProps<T, M> {
  getLambdaMetadata: (params: T, methodName: string) => M;
  descriptorValue?: (descriptor: PropertyDescriptor) => any;
  argumentParser?: Partial<LambdaArgumentsType | (string & {})>;
}
