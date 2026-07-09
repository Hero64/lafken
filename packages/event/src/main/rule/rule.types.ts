import type {
  BucketNames,
  DynamoTableNames,
  EventBusNames,
  EventRuleReferenceNames,
  LambdaMetadata,
  LambdaProps,
} from '@lafken/common';

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
  /**
   * Lambda configuration for the method.
   *
   * Specifies the properties and settings of the Lambda function
   * associated with this API method. This allows you to customize
   * aspects such as timeout, memory, runtime, environment variables,
   * services, and tracing on a per-method basis.
   *
   * @example
   * {
   *   timeout: 300,
   *   memory: 1024,
   *   runtime: 22,
   *   services: ['sqs'],
   *   enableTrace: booleam
   * }
   */
  lambda?: LambdaProps;
  /**
   * Registers this Event Rule as a named global reference, allowing other resources
   * to access its attributes (e.g. execution ARN, endpoint URL) by reference name.
   *
   * @example
   * // Register the API under a reference name
   * ref: 'event-rule'
   */
  ref?: EventRuleReferenceNames;
}

export type S3DetailType = 'Object Created' | 'Object Deleted';

export interface S3Detail {
  bucket?: {
    name: BucketNames[];
  };
  object?: {
    key?: EventBridgePattern[];
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
   * @example
   * {
   *   pattern: {
   *     source: "<event_source>",
   *     detailType: ['foo'],
   *     detail: {
   *       foo: 'bar'
   *     }
   *   }
   * }
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
     * filter which events trigger the rule. Supports nested fields and the
     * `$or` operator to match across multiple fields.
     */
    detail?: EventDetail;
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
   *
   * @example
   * {
   *   pattern: {
   *     detailType: ['Object Created'],
   *     detail: {
   *       bucket: {
   *         name: 'bucket_name'
   *       }
   *     }
   *   }
   * }
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

/**
 * Matches string values regardless of character casing.
 *
 * @example { 'equals-ignore-case': 'alice' }
 */
type EqualsIgnoreCasePattern = { 'equals-ignore-case': string };
/**
 * Matches values that begin with the given prefix. The prefix can also be
 * matched ignoring character casing.
 *
 * @example { prefix: 'us-' }
 * @example { prefix: { 'equals-ignore-case': 'eventb' } }
 */
type PrefixPattern = { prefix: string | EqualsIgnoreCasePattern };
/**
 * Matches values that end with the given suffix. The suffix can also be
 * matched ignoring character casing.
 *
 * @example { suffix: '.png' }
 * @example { suffix: { 'equals-ignore-case': '.png' } }
 */
type SuffixPattern = { suffix: string | EqualsIgnoreCasePattern };
/**
 * Matches string values using the wildcard character (`*`).
 *
 * @example { wildcard: 'dir/*.png' }
 */
type Wildcard = { wildcard: string };
/**
 * Matches IPv4 or IPv6 addresses using CIDR notation.
 *
 * @example { cidr: '10.0.0.0/24' }
 */
type CidrPattern = { cidr: string };
/**
 * Matches everything except the specified value(s). Supports strings and
 * numbers, single values or lists, and can be combined with `prefix`,
 * `suffix`, `wildcard` and `equals-ignore-case`.
 *
 * @example { 'anything-but': 'initializing' }
 * @example { 'anything-but': ['stopped', 'overloaded'] }
 * @example { 'anything-but': [100, 200, 300] }
 * @example { 'anything-but': { prefix: 'init' } }
 * @example { 'anything-but': { suffix: ['.txt', '.rtf'] } }
 * @example { 'anything-but': { wildcard: 'lib*' } }
 * @example { 'anything-but': { 'equals-ignore-case': 'initializing' } }
 */
type AnythingButPattern = {
  'anything-but':
    | string
    | string[]
    | number
    | number[]
    | { prefix: string | string[] }
    | { suffix: string | string[] }
    | { wildcard: string | string[] }
    | { 'equals-ignore-case': string | string[] };
};
/**
 * Matches numeric values using comparison operators, optionally as a range.
 *
 * @example { numeric: ['=', 100] }
 * @example { numeric: ['>', 10, '<=', 20] }
 */
type NumericPattern = {
  numeric:
    | ['=' | '>' | '>=' | '<' | '<=', number]
    | ['>' | '>=', number, '<' | '<=', number];
};
/**
 * Matches based on the presence (`true`) or absence (`false`) of a field.
 *
 * @example { exists: true }
 */
type ExistsPattern = { exists: boolean };

export type EventBridgePattern =
  | string
  | number
  | boolean
  | null
  | PrefixPattern
  | SuffixPattern
  | AnythingButPattern
  | NumericPattern
  | ExistsPattern
  | EqualsIgnoreCasePattern
  | Wildcard
  | CidrPattern;

/**
 * A single field's matching criteria: either one pattern or a list of patterns.
 * A list behaves as an OR between the listed values.
 *
 * @example ['Credit', 'Debit']
 * @example [{ prefix: 'us-' }]
 */
export type EventFieldPattern = EventBridgePattern | EventBridgePattern[];

/**
 * Filtering criteria on the event payload.
 *
 * Maps field names to their matching patterns. Fields can be nested, and the
 * `$or` operator can be used to match if *any* of the grouped conditions are
 * met, across one or more fields.
 *
 * @example
 * {
 *   $or: [
 *     { location: ['New York'] },
 *     { day: ['Monday'] },
 *   ],
 * }
 */
export interface EventDetail {
  /**
   * Matches if *any* of the grouped field conditions are met, across one or
   * more fields. Each entry is an independent set of field patterns.
   *
   * @example
   * $or: [
   *   { 'c-count': [{ numeric: ['>', 0, '<=', 5] }] },
   *   { 'd-count': [{ numeric: ['<', 10] }] },
   * ]
   */
  $or?: EventDetail[];
  [field: string]: EventFieldPattern | EventDetail | EventDetail[] | undefined;
}

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
   *
   * @example
   * {
   *   pattern: {
   *     source: 'dynamo_table_name',
   *     detail: {
   *       eventname: ['INSERT'],
   *       keys: {
   *         PK: ['a', 'b']
   *       }
   *     }
   *   }
   * }
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
