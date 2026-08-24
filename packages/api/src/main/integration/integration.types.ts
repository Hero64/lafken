import type {
  AvailableReference,
  BucketNames,
  DynamoTableNames,
  EventBusNames,
  GetExternalValues,
  GetResourceValue,
  KinesisStreamNames,
  OnlyNumberString,
  OnlyOne,
  QueueNames,
} from '@lafken/common';

/**
 * Base interface for integration options injected via `@IntegrationOptions()`.
 * Provides helper methods to resolve resource references and obtain contextual data.
 *
 * @typeParam T - The type of resource identifier accepted by `getResourceValue` (e.g. `BucketNames`, `QueueScopedNames`).
 * @typeParam V - The attribute types that can be retrieved (defaults to `'arn' | 'id'`).
 *
 * @example
 * ```typescript
 * @Get({ integration: 'dynamodb', action: 'Put' })
 * put(
 *   @IntegrationOptions() { getResourceValue, getCurrentDate }: IntegrationOptionBase
 * ): DynamoPutIntegrationResponse {
 *   return {
 *     data: { name: 'foo', date: getCurrentDate() },
 *     tableName: getResourceValue('dynamo::users', 'id'),
 *   };
 * }
 * ```
 */
export interface IntegrationOptionBase<T = string, V = 'arn' | 'id'>
  extends GetExternalValues {
  /**
   * Retrieves a registered resource attribute (e.g. ARN or ID) by its scoped identifier.
   *
   * @example
   * ```typescript
   * getResourceValue('dynamo::users', 'arn')
   * getResourceValue('pokemon-module::queue::createPokemon', 'name')
   * ```
   */
  getResourceValue: GetResourceValue<T, V>;
  /**
   * Returns the current date as a formatted string.
   * Useful for injecting timestamps into DynamoDB records or other integration payloads.
   *
   * @example
   * ```typescript
   * { date: getCurrentDate() }
   * ```
   */
  getCurrentDate: () => string;
}

/**
 * Response shape for S3 bucket integrations (Download/Upload actions).
 * Specifies the target bucket and object key for the operation.
 *
 * @example
 * ```typescript
 * @Get({ path: 'download', action: 'Download', integration: 'bucket' })
 * download(): BucketIntegrationResponse {
 *   return {
 *     bucket: 'my-bucket',
 *     object: 'reports/monthly.json',
 *   };
 * }
 * ```
 */
export interface BucketIntegrationResponse {
  /** The S3 bucket identifier to target. */
  bucket: BucketNames;
  /** The object key (path) within the bucket (e.g. `'reports/monthly.json'`). */
  object: string;
}

/**
 * Integration options scoped to S3 bucket resources.
 * Allows resolving bucket identifiers via `getResourceValue`.
 *
 * @example
 * ```typescript
 * @Get({ path: 'download', action: 'Download', integration: 'bucket' })
 * download(
 *   @IntegrationOptions() { getResourceValue }: BucketIntegrationOption
 * ): BucketIntegrationResponse {
 *   return {
 *     bucket: getResourceValue('test', 'id'),
 *     object: 'test.json',
 *   };
 * }
 * ```
 */
export type BucketIntegrationOption = IntegrationOptionBase<AvailableReference>;

/**
 * Response shape for starting a Step Functions state machine execution.
 *
 * @typeParam T - The type of the input payload passed to the state machine.
 *
 * @example
 * ```typescript
 * @Post({ path: 'start', integration: 'state-machine', action: 'Start' })
 * start(
 *   @IntegrationOptions() { getResourceValue }: StateMachineIntegrationOption
 * ): StateMachineStartIntegrationResponse {
 *   return {
 *     stateMachineArn: getResourceValue('module::state-machine::workflow', 'arn'),
 *     input: { name: 'test' },
 *   };
 * }
 * ```
 */
export interface StateMachineStartIntegrationResponse<T = any> {
  /** The ARN of the Step Functions state machine to start. */
  stateMachineArn: string;
  /** The input payload passed to the state machine execution. */
  input: T;
}

/**
 * Response shape for checking the status of a Step Functions execution.
 *
 * @example
 * ```typescript
 * @Get({ path: 'status/{id}', integration: 'state-machine', action: 'Status' })
 * status(@Event(Status) e: Status): StateMachineStatusIntegrationResponse {
 *   return { executionArn: e.id };
 * }
 * ```
 */
export interface StateMachineStatusIntegrationResponse {
  /** The ARN of a running state machine execution to check status for. */
  executionArn: string;
}

/**
 * Response shape for stopping a Step Functions execution.
 * Inherits `executionArn` from {@link StateMachineStatusIntegrationResponse}.
 *
 * @example
 * ```typescript
 * @Get({ path: 'stop/{id}', integration: 'state-machine', action: 'Stop' })
 * stop(@Event(Stop) e: Stop): StateMachineStopIntegrationResponse {
 *   return { executionArn: e.id };
 * }
 * ```
 */
export interface StateMachineStopIntegrationResponse
  extends StateMachineStatusIntegrationResponse {}

/**
 * Integration options scoped to Step Functions state machine resources.
 * Resource identifiers follow the format `module::state-machine::name`.
 */
export type StateMachineIntegrationOption = IntegrationOptionBase<AvailableReference>;

/**
 * Integration options scoped to DynamoDB table resources.
 * Resource identifiers follow the format `dynamo::tableName`.
 */
export type DynamoIntegrationOption = IntegrationOptionBase<AvailableReference>;

/**
 * Base interface for DynamoDB integration responses that require a table name.
 */
interface DynamoIntegrationBase {
  /**
   * The DynamoDB table name to operate on.
   *
   * @example
   * ```typescript
   * { tableName: 'users' }
   * // or using a resource reference:
   * { tableName: getResourceValue('dynamo::users', 'id') }
   * ```
   */
  tableName: DynamoTableNames;
}

/**
 * Base interface for DynamoDB operations that require partition and optional sort keys.
 *
 * @typeParam T - The item type used to infer valid key property names.
 */
interface DynamoIntegrationPartitionBase<T = any> extends DynamoIntegrationBase {
  /**
   * The partition key used to identify the item.
   * Exactly one string or number property from `T` must be specified.
   *
   * @example
   * ```typescript
   * { partitionKey: { name: 'foo' } }
   * ```
   */
  partitionKey: OnlyOne<OnlyNumberString<Required<T>>>;
  /**
   * Optional sort key to further narrow the item lookup.
   * Exactly one string or number property from `T` may be specified.
   *
   * @example
   * ```typescript
   * { sortKey: { age: 10 } }
   * ```
   */
  sortKey?: Partial<OnlyOne<OnlyNumberString<Required<T>>>>;
}

/**
 * Response shape for DynamoDB Query integration.
 * Supports querying by partition key, optional sort key, and an optional secondary index.
 *
 * @typeParam T - The item type used to infer valid key property names.
 *
 * @example
 * ```typescript
 * @Get({ integration: 'dynamodb', action: 'Query' })
 * query(): DynamoQueryIntegrationResponse {
 *   return {
 *     tableName: 'users',
 *     partitionKey: { name: 'foo' },
 *     sortKey: { age: 10 },
 *     indexName: 'name-age-index',
 *   };
 * }
 * ```
 */
export interface DynamoQueryIntegrationResponse<T = any>
  extends DynamoIntegrationPartitionBase<T> {
  /** Optional name of a secondary index to query instead of the main table. */
  indexName?: string;
}

/**
 * Response shape for DynamoDB Put integration.
 * Allows inserting or overwriting items, with optional key-based existence validation.
 *
 * @typeParam T - The type of the item data to put into the table.
 *
 * @example
 * ```typescript
 * @Get({ integration: 'dynamodb', action: 'Put' })
 * put(
 *   @IntegrationOptions() { getResourceValue, getCurrentDate }: DynamoIntegrationOption
 * ): DynamoPutIntegrationResponse {
 *   return {
 *     tableName: getResourceValue('dynamo::users', 'id'),
 *     data: { name: 'foo', createdAt: getCurrentDate() },
 *   };
 * }
 * ```
 */
export interface DynamoPutIntegrationResponse<T = any> extends DynamoIntegrationBase {
  /** The item data to put into the table. */
  data: T;
  /**
   * Optional tuple of key names to validate existence before writing.
   * Prevents overwriting existing items that match these keys.
   *
   * @example
   * ```typescript
   * // Single key validation
   * { validateExistKeys: ['id'] }
   * // Composite key validation
   * { validateExistKeys: ['id', 'sortKey'] }
   * ```
   */
  validateExistKeys?:
    | [keyof OnlyNumberString<Required<T>>, keyof OnlyNumberString<Required<T>>]
    | [keyof OnlyNumberString<Required<T>>];
}

/**
 * Response shape for DynamoDB Delete integration.
 * Identifies the item to delete by partition key and optional sort key.
 *
 * @typeParam T - The item type used to infer valid key property names.
 *
 * @example
 * ```typescript
 * @Delete({ integration: 'dynamodb', action: 'Delete' })
 * delete(): DynamoDeleteIntegrationResponse {
 *   return {
 *     tableName: 'users',
 *     partitionKey: { name: 'foo' },
 *     sortKey: { age: 30 },
 *   };
 * }
 * ```
 */
export interface DynamoDeleteIntegrationResponse<T = any>
  extends DynamoIntegrationPartitionBase<T> {}

/**
 * Integration options scoped to SQS queue resources.
 * Resource identifiers follow the format `module::queue::name`.
 * Allows resolving queue `id`, `arn`, or `name`.
 *
 * @example
 * ```typescript
 * @Get({ path: '/send', integration: 'queue', action: 'SendMessage' })
 * send(
 *   @IntegrationOptions() { getResourceValue }: QueueIntegrationOption
 * ): QueueSendMessageIntegrationResponse {
 *   return {
 *     queueName: getResourceValue('pokemon-module::queue::createPokemon', 'name'),
 *     body: 'hello',
 *   };
 * }
 * ```
 */
export type QueueIntegrationOption = IntegrationOptionBase<
  AvailableReference,
  'id' | 'arn' | 'name'
>;

/**
 * Response shape for the SQS SendMessage integration.
 * Specifies the target queue, optional message attributes, body and FIFO settings.
 *
 * @example
 * ```typescript
 * @Get({ integration: 'queue', action: 'SendMessage' })
 * sendMessage(): QueueSendMessageIntegrationResponse {
 *   return {
 *     queueName: 'my-queue',
 *     attributes: { priority: 'high', retryCount: 3 },
 *     body: { userId: '123', action: 'notify' },
 *   };
 * }
 * ```
 */
export interface QueueSendMessageIntegrationResponse {
  /** The SQS queue name to send the message to. */
  queueName: QueueNames;
  /**
   * Optional message attributes as key-value pairs. Values can be static or event
   * fields, the attribute data type is inferred from the value type.
   *
   * @example
   * ```typescript
   * { attributes: { priority: 'high', retryCount: 3, trainer: e.trainer } }
   * ```
   */
  attributes?: Partial<Record<string, string | number>>;
  /**
   * Optional message body payload. Can be a plain string, a full `@Event` object or
   * an object literal mixing static values and event fields.
   *
   * @example
   * ```typescript
   * { body: { name: e.name, level: e.level, source: 'pokedex' } }
   * ```
   */
  body?: any;
  /**
   * Tag that groups the messages of a FIFO queue, the messages sharing a group id
   * are delivered in order. Required by FIFO queues and ignored by standard ones.
   * Only static values are supported, event fields are not resolved.
   *
   * @example
   * ```typescript
   * { groupId: 'pokemon' }
   * ```
   */
  groupId?: string;
  /**
   * Token used by a FIFO queue to discard the messages sent more than once during
   * the deduplication interval. It is not needed when the queue enables content
   * based deduplication. Only static values are supported, event fields are not
   * resolved.
   *
   * @example
   * ```typescript
   * { deduplicationId: 'create-pokemon' }
   * ```
   */
  deduplicationId?: string;
}

/**
 * Option helper injected via `@IntegrationOptions()` for Kinesis integrations.
 *
 * @example
 * ```typescript
 * @Post({ integration: 'kinesis', action: 'PutRecord' })
 * putRecord(
 *   @IntegrationOptions() { getResourceValue }: KinesisIntegrationOption
 * ): KinesisPutRecordIntegrationResponse {
 *   return {
 *     streamName: getResourceValue('kinesis::events', 'name'),
 *     data: 'hello',
 *     partitionKey: 'my-key',
 *   };
 * }
 * ```
 */
export type KinesisIntegrationOption = IntegrationOptionBase<
  AvailableReference,
  'id' | 'arn' | 'name'
>;

/**
 * Response shape for the Kinesis PutRecord integration.
 * Specifies the target stream, record data, and partition key.
 *
 * @example
 * ```typescript
 * @Post({ integration: 'kinesis', action: 'PutRecord' })
 * putRecord(): KinesisPutRecordIntegrationResponse {
 *   return {
 *     streamName: 'my-stream',
 *     data: { userId: '123', action: 'created' },
 *     partitionKey: 'user-123',
 *   };
 * }
 * ```
 */
export interface KinesisPutRecordIntegrationResponse {
  /** The Kinesis stream name to put the record into. */
  streamName: KinesisStreamNames;
  /** The record data payload. Can be a plain value or a full `@Event` object — will be base64 encoded. */
  data: unknown;
  /** Partition key used to route the record to a shard. Can be a literal or an `@Event` parameter. */
  partitionKey: string;
  /** Optional sequence number for ordering within the same shard. */
  sequenceNumberForOrdering?: string;
}

/**
 * Option helper injected via `@IntegrationOptions()` for EventBridge integrations.
 *
 * Resource identifiers follow the format `event-bus::busName`.
 * Allows resolving event bus `id` (the bus name) or `arn`.
 *
 * @example
 * ```typescript
 * @Post({ integration: 'event-bridge', action: 'PutEvents' })
 * publish(
 *   @IntegrationOptions() { getResourceValue }: EventBridgeIntegrationOption
 * ): EventBridgePutEventsIntegrationResponse {
 *   return {
 *     eventBusName: getResourceValue('event-bus::orders', 'id'),
 *     source: 'orders',
 *     detailType: 'OrderCreated',
 *     detail: { orderId: '123' },
 *   };
 * }
 * ```
 */
export type EventBridgeIntegrationOption = IntegrationOptionBase<
  AvailableReference,
  'id' | 'arn'
>;

/**
 * Response shape for the EventBridge PutEvents integration.
 * Publishes a single event entry to an event bus.
 *
 * @example
 * ```typescript
 * @Post({ integration: 'event-bridge', action: 'PutEvents' })
 * publish(): EventBridgePutEventsIntegrationResponse {
 *   return {
 *     eventBusName: 'orders-bus',
 *     source: 'orders',
 *     detailType: 'OrderCreated',
 *     detail: { orderId: '123', items: 2 },
 *   };
 * }
 * ```
 */
export interface EventBridgePutEventsIntegrationResponse {
  /**
   * The EventBridge event bus name to publish the event to.
   * Can be a literal or resolved with `getResourceValue('event-bus::name', 'id')`.
   * When omitted, the default event bus is used.
   */
  eventBusName?: EventBusNames;
  /**
   * The source of the event, used to identify the service or application
   * that published it. Can be a literal or an `@Event` parameter.
   *
   * @example
   * ```typescript
   * { source: 'orders' }
   * ```
   */
  source: string;
  /**
   * The detail type of the event, used to distinguish events with
   * different payload shapes. Can be a literal or an `@Event` parameter.
   *
   * @example
   * ```typescript
   * { detailType: 'OrderCreated' }
   * ```
   */
  detailType: string;
  /**
   * The event payload, serialized as the `Detail` JSON string. Accepts a
   * plain object literal mixing static values and `@Event` fields, including
   * nested ones, or a full `@Event` object with body source parameters.
   *
   * @example
   * ```typescript
   * { detail: { orderId: e.orderId, status: 'created' } }
   * ```
   */
  detail: any;
}
