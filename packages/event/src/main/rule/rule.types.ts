import type {
  BucketNames,
  DynamoTableNames,
  EventBusNames,
  LambdaMetadata,
} from '@alicanto/common';

export interface EventRuleBaseProps {
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
   * Event bus name.
   *
   * Specifies the EventBridge bus where the rule will be created.
   * If not provided, the default event bus is used.
   */
  bus?: EventBusNames;
}

export type S3DetailType = 'Object Created' | 'Object Deleted';
export type S3ObjectKey = {
  prefix?: string;
  suffix?: string;
};

export interface S3Detail {
  bucket?: {
    name: BucketNames[];
  };
  object?: {
    key?: (S3ObjectKey | string)[];
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
    detailType: S3DetailType[];
    /**
     * Additional filtering criteria on the event payload.
     *
     * Optional object specifying conditions on event attributes to further
     * filter which events trigger the rule.
     */
    detail: S3Detail;
  };
}

type PrefixPattern = { prefix: string };
type SuffixPattern = { suffix: string };
type AnythingButPattern = { 'anything-but': string | string[] };
type NumericPattern = {
  numeric:
    | ['=' | '>' | '>=' | '<' | '<=', number]
    | ['>' | '>=', number, '<' | '<=', number];
};
type ExistsPattern = { exists: boolean };
type EqualsIgnoreCasePattern = { 'equals-ignore-case': string };

export type EventBridgePattern =
  | string
  | number
  | boolean
  | PrefixPattern
  | SuffixPattern
  | AnythingButPattern
  | NumericPattern
  | ExistsPattern
  | EqualsIgnoreCasePattern;

export type DynamoAttributeFilter = EventBridgePattern | EventBridgePattern[];
export type DynamoAttributeFilters = Record<string, DynamoAttributeFilter>;
interface DynamoDetail {
  eventName?: ('INSERT' | 'MODIFY' | 'REMOVE')[];
  keys?: DynamoAttributeFilters;
  newImage?: DynamoAttributeFilters;
  oldImage?: DynamoAttributeFilters;
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
    source: DynamoTableNames;
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

export type EventRuleMetadata = LambdaMetadata & EventRuleProps;
