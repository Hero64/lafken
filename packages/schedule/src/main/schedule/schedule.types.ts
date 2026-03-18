import type { LambdaMetadata, ResourceOutputType } from '@lafken/common';

type ScheduleExpressions = number | '*' | '?' | (string & {});

/**
 * Attributes that can be exported from an EventBridge schedule rule resource.
 *
 * Based on Terraform `aws_cloudwatch_event_rule` attribute reference:
 * - `arn`: The Amazon Resource Name (ARN) of the rule.
 * - `id`: The name of the rule.
 */
export type ScheduleOutputAttributes = 'arn' | 'id';

export interface ScheduleTime {
  day?: ScheduleExpressions;
  hour?: ScheduleExpressions;
  minute?: ScheduleExpressions;
  month?: ScheduleExpressions;
  weekDay?: ScheduleExpressions;
  year?: ScheduleExpressions;
}

export interface EventCronProps {
  /**
   * Maximum event age.
   *
   * Specifies the maximum age of an event that can be sent to the rule's targets.
   * Events older than this duration will be discarded.
   */
  maxEventAge?: number;
  /**
   * Retry attempts for failed events.
   *
   * Specifies the maximum number of times EventBridge will retry sending
   * an event to the target if the initial attempt fails.
   */
  retryAttempts?: number;
  /**
   * Schedule for the EventBridge rule.
   *
   * Defines when the rule should trigger, either using a cron expression
   * or a structured schedule object. This allows for time-based Lambda invocation
   *
   * You can provide:
   * - A cron string in the standard AWS format: `cron(* * * * * *)`
   * - A `ScheduleTime` object to specify individual fields:
   *   - `minute`, `hour`, `day`, `month`, `weekDay`, `year`
   *   - Each field can be a number, '*', '?', a range `${number}-${number}`
   */
  schedule: string | ScheduleTime;
  /**
   * Defines which EventBridge schedule rule attributes should be exported.
   *
   * Supported attributes are based on Terraform `aws_cloudwatch_event_rule`
   * attribute reference:
   * - `arn`: The Amazon Resource Name (ARN) of the rule.
   * - `id`: The name of the rule.
   *
   * Each selected attribute can be exported through SSM Parameter Store (`type: 'ssm'`)
   * or Terraform outputs (`type: 'output'`).
   *
   * @example
   * {
   *   outputs: [
   *     { type: 'ssm', name: '/my-app/schedule-arn', value: 'arn' },
   *     { type: 'output', name: 'schedule_id', value: 'id' }
   *   ]
   * }
   */
  outputs?: ResourceOutputType<ScheduleOutputAttributes>;
}

export interface EventCronMetadata extends LambdaMetadata, EventCronProps {}
