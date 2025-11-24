import type { LambdaMetadata } from '@alicanto/common';

type ScheduleExpressions = number | '*' | '?' | `${number}-${number}` | `*/${number}`;

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
}

export interface EventCronMetadata extends LambdaMetadata, EventCronProps {}
