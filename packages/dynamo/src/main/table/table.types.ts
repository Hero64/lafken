import 'reflect-metadata';
import type {
  DeepPartial,
  DynamoReferenceNames,
  DynamoTableNames,
  FieldTypes,
  OnlyNumber,
  OnlyNumberString,
  ResourceOutputType,
} from '@lafken/common';

/**
 * Internal metadata keys used to store DynamoDB table configuration
 * via `Reflect.defineMetadata`.
 */
export enum TableMetadataKeys {
  table = 'dynamo:table',
  partition_key = 'dynamo:partition_key',
  sort_key = 'dynamo:sort_key',
  fields = 'dynamo:fields',
}

export type TableOutputAttributes = 'arn' | 'id' | 'streamArn' | 'streamLabel';

/**
 * Base configuration shared by all DynamoDB secondary indexes.
 *
 * @typeParam T - The table class whose properties define the available attributes.
 */
interface IndexBase<T extends Function> {
  /** Logical name of the index. */
  name: string;
  /**
   * Attributes projected into the index.
   *
   * Pass an array of property names to project only specific attributes,
   * or `'ALL'` to include every attribute from the base table.
   */
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

/**
 * Configuration for a DynamoDB **Local Secondary Index** (LSI).
 *
 * A local index shares the same partition key as the base table but
 * uses a different sort key, enabling alternative query patterns
 * within the same partition.
 *
 * @typeParam T - The table class whose properties define the available attributes.
 */
export interface LocalIndex<T extends Function> extends IndexBase<T> {
  /** Must be `'local'` to indicate a Local Secondary Index. */
  type: 'local';
  /** The table property used as the sort key for this index. */
  sortKey: keyof OnlyNumberString<T['prototype']>;
}

/**
 * Configuration for a DynamoDB **Global Secondary Index** (GSI).
 *
 * A global index has its own partition key (and optional sort key),
 * allowing queries across the entire table with a completely different
 * key schema.
 *
 * @typeParam T - The table class whose properties define the available attributes.
 */
export interface GlobalIndex<T extends Function> extends IndexBase<T> {
  /** Set to `'global'` (or omit) to indicate a Global Secondary Index. */
  type?: 'global';
  /**
   * The table property (or composite of properties) used as the
   * partition key for this index.
   */
  partitionKey:
    | keyof OnlyNumberString<T['prototype']>
    | (keyof OnlyNumberString<T['prototype']>)[];
  /**
   * Optional table property (or composite of properties) used as the
   * sort key for this index.
   */
  sortKey?:
    | keyof OnlyNumberString<T['prototype']>
    | (keyof OnlyNumberString<T['prototype']>)[];
}

/**
 * A Global Secondary Index with explicit read/write capacity units.
 * Used when the table billing mode is `'provisioned'`.
 */
export type GlobalIndexWithReadWriteCapacity<T extends Function> = GlobalIndex<T> &
  ReadWriteCapacity;

/**
 * Provisioned throughput settings for a DynamoDB table or index.
 */
export interface ReadWriteCapacity {
  /** Maximum number of strongly consistent reads per second. */
  readCapacity: number;
  /** Maximum number of writes per second. */
  writeCapacity: number;
}

/**
 * Union of all secondary index types allowed when the table uses
 * pay-per-request billing.
 */
export type DynamoIndex<T extends Function> = LocalIndex<T> | GlobalIndex<T>;

/**
 * Supported DynamoDB Stream view types.
 *
 * Determines which item data is written to the stream record when a
 * table item is modified.
 */
export type StreamTypes = 'NEW_IMAGE' | 'OLD_IMAGE' | 'NEW_AND_OLD_IMAGES' | 'KEYS_ONLY';

/**
 * Configuration for a DynamoDB Global Table replica in another AWS region.
 */
export interface Replica {
  /** AWS region where the replica will be created (e.g. `'us-east-2'`). */
  regionName: string;
  /**
   * Read consistency mode for the replica.
   *
   * - `'STRONG'`    — Strongly consistent reads.
   * - `'EVENTUAL'`  — Eventually consistent reads (default DynamoDB behaviour).
   */
  consistenceMode?: 'STRONG' | 'EVENTUAL';
  /** When `true`, the replica cannot be deleted accidentally. */
  deletionProtectionEnabled?: boolean;
  /** When `true`, tags from the primary table are propagated to the replica. */
  propagateTags?: boolean;
}

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
  keys?: AttributeFilter<TablePartition<T>>;
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
   *
   * @example
   * {
   *   filters: {
   *     eventName: ['INSERT'],
   *     keys: {
   *       PK: ['foo']
   *     },
   *     newImage: {
   *       bar: [1, 2, 3]
   *     }
   *   }
   * }
   */
  filters?: FilterCriteria<T>;
}

export interface TableBase<T extends Function> {
  isExternal?: never;
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
   * - `source` is set to `dynamodb.<table_name>`, where `<table_name>` is
   *   the name of the decorated class.
   *
   * @example {
   *   stream: {
   *     enabled: true,
   *     type: ['NEW_AND_OLD_IMAGES'],
   *     batchSize: 10,
   *     maximumBatchingWindowInSeconds: 10,
   *     filters: {
   *       eventName: ['INSERT'],
   *       keys: {
   *         PK: ['foo']
   *       },
   *       newImage: {
   *         bar: [1, 2, 3]
   *       }
   *     }
   *   }
   * }
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
   * {
   * // Items with an 'expiresAt' attribute set to a future Unix timestamp will be removed after that time.
   * ttl: 'expiresAt'
   * }
   */
  ttl?: keyof OnlyNumber<T['prototype']>;
  /**
   * Define the dyanamo table replication mode across another regions
   *
   * @example
   * {
   *   replica: [{
   *     regionName: 'us-east-2',
   *     consistenceMode: 'EVENTUAL'
   *   }]
   * }
   */
  replica?: Replica[];

  /**
   * Defines which DynamoDB table attributes should be exported.
   *
   * Supported attributes are based on Terraform `aws_dynamodb_table`
   * exported attributes and currently include:
   * - `arn`: ARN of the table.
   * - `id`: Name of the table.
   * - `streamArn`: ARN of the table stream. Only available when stream is enabled.
   * - `streamLabel`: ISO 8601 timestamp for the table stream. Only available when stream is enabled.
   *
   * Each selected attribute can be exported through SSM Parameter Store (`type: 'ssm'`)
   * or Terraform outputs (`type: 'output'`).
   *
   * @example
   * {
   *   outputs: [
   *     { type: 'ssm', name: '/my-table/arn', value: 'arn' },
   *     { type: 'output', name: 'table_stream_arn', value: 'streamArn' }
   *   ]
   * }
   */
  outputs?: ResourceOutputType<TableOutputAttributes>;
  /**
   * Registers this Table as a named global reference, allowing other resources
   * to access its attributes (e.g. ARN) by reference name.
   *
   * @example
   * // Register the API under a reference name
   * ref: 'order'
   */
  ref?: DynamoReferenceNames;
}

export interface TableProvisioned<T extends Function>
  extends TableBase<T>,
    ReadWriteCapacity {
  billingMode: 'provisioned';
  /**
   * Table indexes.
   *
   * Defines the secondary indexes to apply on the DynamoDB table.
   * These indexes can be used to optimize query patterns or support
   * additional access patterns.
   */
  indexes?: (LocalIndex<T> | GlobalIndexWithReadWriteCapacity<T>)[];
}

export interface TablePayPerRequest<T extends Function> extends TableBase<T> {
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

export type InternalTableProps<T extends Function> =
  | TableProvisioned<T>
  | TablePayPerRequest<T>;

export interface ExternalTableProps<T extends Function>
  extends Omit<InternalTableProps<T>, 'outputs' | 'replica' | 'stream' | 'isExternal'> {
  /**
   * Marks the DynamoDB table as an external resource.
   *
   * When set to `true`, the table is not created by the framework.
   * Instead, it references an existing DynamoDB table using the provided `name`.
   */
  isExternal: true;
}

export type DynamoTableProps<T extends Function> =
  | InternalTableProps<T>
  | ExternalTableProps<T>;

export interface InternalTableMetadata extends Omit<InternalTableProps<any>, 'name'> {
  name: string;
}

export interface ExternalTableMetadata extends Omit<ExternalTableProps<any>, 'name'> {
  name: string;
}

export type TableMetadata = InternalTableMetadata | ExternalTableMetadata;

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

export type TablePartition<T> = {
  [K in keyof T as [Extract<T[K], Partition>] extends [never] ? never : K]: T[K];
};
