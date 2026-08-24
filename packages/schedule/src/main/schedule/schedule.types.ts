import type {
  LambdaMetadata,
  ResourceOutputType,
  ScheduleReferenceNames,
} from '@lafken/common';

type ScheduleExpressions = number | '*' | '?' | (string & {});

/**
 * Attributes that can be exported from an EventBridge Scheduler resource.
 *
 * Based on Terraform `aws_scheduler_schedule` attribute reference:
 * - `arn`: The Amazon Resource Name (ARN) of the schedule.
 * - `id`: The name of the schedule.
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
   * Timezone in which the schedule expression is evaluated.
   *
   * Accepts an IANA timezone name (e.g. `'America/Santiago'`, `'UTC'`).
   * If omitted, the schedule is evaluated in UTC.
   *
   * Maps to the `scheduleExpressionTimezone` attribute of the EventBridge
   * Scheduler resource. Note that the timezone is independent from the cron
   * expression itself.
   *
   * @example
   * timezone: 'America/Santiago'
   */
  timezone?: string;
  /**
   * Human-readable description of the schedule.
   *
   * Useful for documentation purposes; shown in the AWS console.
   */
  description?: string;
  /**
   * State of the schedule.
   *
   * Allows pausing the schedule without deleting it:
   * - `'enabled'` (default): the schedule is active.
   * - `'disabled'`: the schedule will not trigger its target.
   */
  state?: 'enabled' | 'disabled';
  /**
   * Date and time, in ISO 8601 format, after which the schedule can begin
   * invoking its target.
   *
   * @example
   * startDate: '2026-07-01T00:00:00Z'
   */
  startDate?: string;
  /**
   * Date and time, in ISO 8601 format, before which the schedule can invoke
   * its target. After this point the schedule stops triggering.
   *
   * @example
   * endDate: '2026-12-31T23:59:59Z'
   */
  endDate?: string;
  /**
   * Maximum flexible time window, in minutes, within which the schedule can be
   * invoked.
   *
   * When provided, the schedule runs in `FLEXIBLE` mode and EventBridge may
   * invoke the target at any point inside this window (useful to spread load
   * and avoid thundering-herd effects). If omitted, the schedule runs in `OFF`
   * mode and triggers at the exact scheduled time.
   *
   * @example
   * flexibleWindowMinutes: 15
   */
  flexibleWindowMinutes?: number;
  /**
   * Defines which EventBridge Scheduler attributes should be exported.
   *
   * Supported attributes are based on Terraform `aws_scheduler_schedule`
   * attribute reference:
   * - `arn`: The Amazon Resource Name (ARN) of the schedule.
   * - `id`: The name of the schedule.
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
  /**
   * Registers this Eventbridge schedule as a named global reference, allowing other resources
   * to access its attributes (e.g. execution ARN) by reference name.
   *
   * @example
   * // Register the API under a reference name
   * ref: 'my-state-machine'
   */
  ref?: ScheduleReferenceNames;
}

export interface EventCronMetadata extends LambdaMetadata, EventCronProps {}
