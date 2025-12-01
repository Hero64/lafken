import 'reflect-metadata';
import type {
  DeepPartial,
  DynamoTableNames,
  FieldTypes,
  OnlyNumber,
  OnlyNumberString,
} from '@alicanto/common';

export enum ModelMetadataKeys {
  model = 'dynamo:model',
  partition_key = 'dynamo:partition_key',
  sort_key = 'dynamo:sort_key',
  fields = 'dynamo:fields',
}

interface IndexBase<T extends Function> {
  name: string;
  projection?: (keyof T['prototype'])[] | 'ALL';
}

type AttributeFilter<T> = {
  [key in keyof T]?:
    | (
        | T[key]
        | { 'anything-but': T[key][] }
        | { exists: boolean }
        | { prefix: T[key] }
        | ''
      )[]
    | null;
};

export interface LocalIndex<T extends Function> extends IndexBase<T> {
  type: 'local';
  sortKey: keyof OnlyNumberString<T['prototype']>;
}

export interface GlobalIndex<T extends Function> extends IndexBase<T> {
  type?: 'global';
  partitionKey: keyof OnlyNumberString<T['prototype']>;
  sortKey?: keyof OnlyNumberString<T['prototype']>;
}

export interface ReadWriteCapacity {
  readCapacity: number;
  writeCapacity: number;
}

export type DynamoIndex<T extends Function> = LocalIndex<T> | GlobalIndex<T>;

export type StreamTypes = 'NEW_IMAGE' | 'OLD_IMAGE' | 'NEW_AND_OLD_IMAGES' | 'KEYS_ONLY';

export interface FilterCriteria<T> {
  /**
   * Event types to include in the stream.
   *
   * Specify one or more of the following:
   * - `'INSERT'` – Record when a new item is added.
   * - `'MODIFY'` – Record when an existing item is modified.
   * - `'REMOVE'` – Record when an item is deleted.
   */
  eventName?: ('INSERT' | 'MODIFY' | 'REMOVE')[];
  /**
   * Filter by specific partition keys.
   *
   * Only records with the specified partition key values will be included.
   */
  keys?: AttributeFilter<ModelPartition<T>>;
  /**
   * Filter based on the new image of the item.
   *
   * Allows applying conditions to the attributes of the new item image
   * after an INSERT or MODIFY event.
   */
  newImage?: AttributeFilter<DeepPartial<T>>;
  /**
   * Filter based on the old image of the item.
   *
   * Allows applying conditions to the attributes of the old item image
   * before a MODIFY or REMOVE event.
   */
  oldImage?: AttributeFilter<DeepPartial<T>>;
}

export interface DynamoStream<T> {
  /**
   * Enable DynamoDB Stream.
   *
   * Specifies whether the DynamoDB Stream is active for the table.
   * When enabled, changes to items in the table (insert, modify, remove)
   * will be captured and can be consumed by EventBridge or Lambda functions.
   */
  enabled?: boolean;
  /**
   * Stream type.
   *
   * Specifies which information is captured in the DynamoDB Stream
   * when items in the table are modified.
   *
   * Available options:
   * - `'NEW_IMAGE'` – Only the new item image is recorded.
   * - `'OLD_IMAGE'` – Only the old item image is recorded.
   * - `'NEW_AND_OLD_IMAGES'` – Both new and old images are recorded.
   * - `'KEYS_ONLY'` – Only the key attributes are recorded.
   *
   * @default  "NEW_AND_OLD_IMAGES"
   */
  type?: StreamTypes;
  /**
   * Batch size for stream events.
   *
   * Specifies the maximum number of records that will be sent
   * in a single batch to the event consumer.
   * Adjusting this value can help control memory usage and processing throughput.
   */
  batchSize?: number;
  /**
   * Maximum batching window in seconds.
   *
   * Specifies the maximum amount of time to gather records before
   * sending a batch to the event consumer.
   * This allows for combining multiple changes into a single batch,
   * potentially reducing the number of invocations.
   *
   * @default 1
   */
  maximumBatchingWindowInSeconds?: number;
  /**
   * Stream filters.
   *
   * Specifies filter criteria to selectively process only certain records
   * from the DynamoDB Stream. This allows you to ignore events that do
   * not match the defined conditions, reducing unnecessary processing.
   */
  filters?: FilterCriteria<T>;
}

export interface ModelBase<T extends Function> {
  /**
   * Table name.
   *
   * Defines the logical name of the DynamoDB table.
   * If not specified, the name of the decorated class will be used.
   */
  name?: DynamoTableNames;
  /**
   * Enable X-Ray tracing.
   *
   * When enabled, AWS X-Ray tracing is activated for all operations
   * on this DynamoDB table. This allows you to trace and analyze
   * requests, helping with debugging and performance monitoring.
   */
  tracing?: boolean;
  /**
   * Enable DynamoDB Streams via EventBridge.
   *
   * When enabled, the table will send stream events for item changes
   * (insert, modify, remove) through EventBridge. This allows other
   * services to react to changes in the table in near real-time.
   *
   * - `detailType` is always set to `'db:stream'`.
   * - `source` is set to `dynamodb.<model_name>`, where `<model_name>` is
   *   the name of the decorated class.
   */
  stream?: DynamoStream<T['prototype']>;
  /**
   * Defines the name of the attribute used as the TTL (Time to Live) field in DynamoDB.
   *
   * When specified, this attribute determines when an item will automatically expire and be deleted
   * by DynamoDB. The value of this field should be a Unix timestamp (in seconds) representing
   * the expiration time.
   *
   * @example
   * ```ts
   * ttl: 'expiresAt'
   * // Items with an 'expiresAt' attribute set to a future Unix timestamp will be removed after that time.
   * ```
   */
  ttl?: keyof OnlyNumber<T['prototype']>;
}

export interface ModelProvisioned<T extends Function>
  extends ModelBase<T>,
    ReadWriteCapacity {
  billingMode: 'provisioned';
  /**
   * Table indexes.
   *
   * Defines the secondary indexes to apply on the DynamoDB table.
   * These indexes can be used to optimize query patterns or support
   * additional access patterns.
   */
  indexes?: (LocalIndex<T> | (GlobalIndex<T> & ReadWriteCapacity))[];
}

export interface ModelPayPerRequest<T extends Function> extends ModelBase<T> {
  billingMode?: 'pay_per_request';
  /**
   * Table indexes.
   *
   * Defines the secondary indexes to apply on the DynamoDB table.
   * These indexes can be used to optimize query patterns or support
   * additional access patterns.
   */
  indexes?: DynamoIndex<T>[];
}

export type DynamoModelProps<T extends Function> =
  | ModelProvisioned<T>
  | ModelPayPerRequest<T>;

export interface FieldProps {
  type?:
    | StringConstructor
    | NumberConstructor
    | BooleanConstructor
    | [Function]
    | Function;
}

export interface FieldMetadata {
  name: string;
  type: FieldTypes;
}

export type FieldsMetadata = Record<string, FieldMetadata>;

type Partition = { __special: unknown };

export type PrimaryPartition<T = never> = T | (T & Partition);

export type ModelPartition<T> = {
  [K in keyof T as [Extract<T[K], Partition>] extends [never] ? never : K]: T[K];
};
