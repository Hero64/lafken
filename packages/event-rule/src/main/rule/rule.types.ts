import type {
  BucketNames,
  DynamoDbNames,
  EventBusNames,
  LambdaMetadata,
} from '@alicanto/common';

export interface CommonEventProps {
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
}

export interface EventRuleBaseProps extends CommonEventProps {
  /**
   * Event bus name.
   *
   * Specifies the EventBridge bus where the rule will be created.
   * If not provided, the default event bus is used.
   */
  bus?: EventBusNames;
}

export type S3DetailType = 'Object Created' | 'Object Deleted';
export type S3ObjectKey =
  | {
      type: 'prefix';
      value: string;
    }
  | {
      type: 'suffix';
      value: string;
    };

export interface S3Detail {
  bucket?: {
    name: BucketNames[];
  };
  object?: {
    key?: S3ObjectKey[];
  };
}

export interface EventDefaultRuleProps extends EventRuleBaseProps {
  /**
   * Integration source for the EventBridge rule.
   *
   * Specifies the AWS service that will emit events for this rule.
   * Common examples include:
   * - `'dynamodb'` – captures events from a DynamoDB table.
   * - `'s3'` – captures events from an S3 bucket.
   */
  integration?: never;
  /**
   * Event pattern for the EventBridge rule.
   *
   * Defines the filtering criteria that determine which events
   * trigger the rule. Events are matched against the specified
   * pattern fields.
   */
  pattern: {
    /**
     * Event source.
     *
     * Specifies the AWS service or custom source that emits the events
     * to be captured by this EventBridge rule.
     */
    source: string;
    /**
     * Event types to match.
     *
     * Optional array of event types (detailType) that should trigger the rule.
     * If not specified, all event types from the source are captured.
     */
    detailType?: string[];
    /**
     * Additional filtering criteria on the event payload.
     *
     * Optional object specifying conditions on event attributes to further
     * filter which events trigger the rule.
     */
    detail?: any;
  };
}

export interface EventS3RuleProps extends EventRuleBaseProps {
  /**
   * Integration source for the EventBridge rule.
   *
   * Specifies the AWS service that will emit events for this rule.
   * Common examples include:
   * - `'dynamodb'` – captures events from a DynamoDB table.
   * - `'s3'` – captures events from an S3 bucket.
   */
  integration: 's3';
  /**
   * Event pattern for the EventBridge rule.
   *
   * Defines the filtering criteria that determine which events
   * trigger the rule. Events are matched against the specified
   * pattern fields.
   */
  pattern: {
    /**
     * Event types to match.
     *
     * Optional array of event types (detailType) that should trigger the rule.
     * If not specified, all event types from the source are captured.
     */
    detailType?: S3DetailType[];
    /**
     * Additional filtering criteria on the event payload.
     *
     * Optional object specifying conditions on event attributes to further
     * filter which events trigger the rule.
     */
    detail?: S3Detail;
  };
}

interface DynamoDetail {
  eventName?: ('INSERT' | 'MODIFY' | 'REMOVE')[];
  keys?: Record<string, number | string>;
}

export interface DynamoRuleProps extends EventRuleBaseProps {
  /**
   * Integration source for the EventBridge rule.
   *
   * Specifies the AWS service that will emit events for this rule.
   * Common examples include:
   * - `'dynamodb'` – captures events from a DynamoDB table.
   * - `'s3'` – captures events from an S3 bucket.
   */
  integration: 'dynamodb';
  /**
   * Event pattern for the EventBridge rule.
   *
   * Defines the filtering criteria that determine which events
   * trigger the rule. Events are matched against the specified
   * pattern fields.
   */
  pattern: {
    /**
     * Event source.
     *
     * Specifies the AWS service or custom source that emits the events
     * to be captured by this EventBridge rule.
     */
    source: DynamoDbNames;
    /**
     * Additional filtering criteria on the event payload.
     *
     * Optional object specifying conditions on event attributes to further
     * filter which events trigger the rule.
     */
    detail?: DynamoDetail;
  };
}

export type EventRuleProps = EventDefaultRuleProps | EventS3RuleProps | DynamoRuleProps;

type ScheduleExpressions = number | '*' | '?' | `${number}-${number}` | `*/${number}`;

export interface ScheduleTime {
  day?: ScheduleExpressions;
  hour?: ScheduleExpressions;
  minute?: ScheduleExpressions;
  month?: ScheduleExpressions;
  weekDay?: ScheduleExpressions;
  year?: ScheduleExpressions;
}

export interface EventCronProps extends CommonEventProps {
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

export type EventRuleMetadata = LambdaMetadata &
  EventRuleProps & {
    eventType: 'rule';
  };

export interface EventCronMetadata extends LambdaMetadata, EventCronProps {
  eventType: 'cron';
}

export type EventLambdaMetadata = EventRuleMetadata | EventCronMetadata;
